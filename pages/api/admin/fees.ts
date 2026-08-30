import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { withTransaction, safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'instructor')) {
    return res.status(403).json({ error: 'Access denied: Admin or Instructor credentials required.' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const { month } = req.query;
      let fees;

      if (session.user.role === 'instructor') {
        if (month) {
          fees = await safeQuery(`
            SELECT
              f.id,
              s.id as student_id,
              ? as billing_month,
              COALESCE(f.amount, 1500) as amount,
              COALESCE(DATE_FORMAT(f.due_date, '%Y-%m-%d'), CONCAT(?, '-10')) as due_date,
              COALESCE(f.status, 'unbilled') as status,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              s.belt_rank,
              DATE_FORMAT(s.joining_date, '%Y-%m-%d') as joining_date
            FROM students s
            LEFT JOIN fees f ON f.student_id = s.id AND DATE_FORMAT(f.billing_month, '%Y-%m') = ?
            WHERE s.id IN (
              SELECT DISTINCT ce.student_id 
              FROM class_enrollments ce
              JOIN classes c ON ce.class_id = c.id
              JOIN instructors i ON c.instructor_id = i.id
              WHERE i.user_id = ? AND ce.status = 'enrolled'
            )
            AND (s.joining_date IS NULL OR DATE_FORMAT(s.joining_date, '%Y-%m') <= ?)
            ORDER BY 
              CASE COALESCE(f.status, 'unbilled')
                WHEN 'overdue' THEN 1
                WHEN 'unpaid' THEN 2
                WHEN 'unbilled' THEN 3
                WHEN 'paid' THEN 4
                ELSE 5
              END,
              s.first_name ASC
          `, [month, month, month, session.user.id, month]);
        } else {
          fees = await safeQuery(`
            SELECT
              f.id,
              f.student_id,
              DATE_FORMAT(f.billing_month, '%Y-%m') as billing_month,
              f.amount,
              DATE_FORMAT(f.due_date, '%Y-%m-%d') as due_date,
              f.status,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              s.belt_rank
            FROM fees f
            JOIN students s ON f.student_id = s.id
            WHERE f.student_id IN (
              SELECT DISTINCT ce.student_id 
              FROM class_enrollments ce
              JOIN classes c ON ce.class_id = c.id
              JOIN instructors i ON c.instructor_id = i.id
              WHERE i.user_id = ? AND ce.status = 'enrolled'
            )
            ORDER BY f.billing_month DESC, f.status ASC
          `, [session.user.id]);
        }
      } else {
        if (month) {
          fees = await safeQuery(`
            SELECT 
              f.id,
              s.id as student_id,
              ? as billing_month,
              COALESCE(f.amount, 1500) as amount,
              COALESCE(DATE_FORMAT(f.due_date, '%Y-%m-%d'), CONCAT(?, '-10')) as due_date,
              COALESCE(f.status, 'unbilled') as status,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              s.belt_rank,
              DATE_FORMAT(s.joining_date, '%Y-%m-%d') as joining_date
            FROM students s
            LEFT JOIN fees f ON f.student_id = s.id AND DATE_FORMAT(f.billing_month, '%Y-%m') = ?
            WHERE (s.joining_date IS NULL OR DATE_FORMAT(s.joining_date, '%Y-%m') <= ?)
            ORDER BY 
              CASE COALESCE(f.status, 'unbilled')
                WHEN 'overdue' THEN 1
                WHEN 'unpaid' THEN 2
                WHEN 'unbilled' THEN 3
                WHEN 'paid' THEN 4
                ELSE 5
              END,
              s.first_name ASC
          `, [month, month, month, month]);
        } else {
          fees = await safeQuery(`
            SELECT 
              f.id,
              f.student_id,
              DATE_FORMAT(f.billing_month, '%Y-%m') as billing_month,
              f.amount,
              DATE_FORMAT(f.due_date, '%Y-%m-%d') as due_date,
              f.status,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              s.belt_rank
            FROM fees f
            JOIN students s ON f.student_id = s.id
            ORDER BY f.billing_month DESC, f.status ASC
          `);
        }
      }

      return res.status(200).json({ success: true, fees });
    } catch (error: any) {
      console.error('Failed to fetch bills:', error);
      return res.status(500).json({ error: 'Failed to retrieve bills: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { action, student_id, billing_month, amount, due_date, status } = req.body;

      // Batch Monthly Generation Action (Admin Only)
      if (action === 'batch') {
        if (session.user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied: Admin credentials required for batch billing.' });
        }

        if (!billing_month || !amount || !due_date) {
          return res.status(400).json({ error: 'Missing required batch billing parameters.' });
        }

        const billingMonthStr = `${billing_month}-01`;

        // Fetch all active enrolled students joining on/before billing_month
        const students = await safeQuery(`
          SELECT DISTINCT s.id, s.user_id, s.first_name, s.last_name 
          FROM students s
          JOIN class_enrollments ce ON ce.student_id = s.id
          WHERE ce.status = 'enrolled' 
            AND s.enrollment_status = 'active'
            AND (s.joining_date IS NULL OR DATE_FORMAT(s.joining_date, '%Y-%m') <= ?)
        `, [billing_month]);

        if (!students || students.length === 0) {
          return res.status(400).json({ error: 'No active enrolled students found to bill for this month.' });
        }

        // Find students already billed for this month
        const existingBills = await safeQuery(
          `SELECT student_id FROM fees WHERE DATE_FORMAT(billing_month, '%Y-%m') = ?`,
          [billing_month]
        );
        const billedStudentIds = new Set((existingBills || []).map((b: any) => b.student_id));

        const unbilledStudents = students.filter((s: any) => !billedStudentIds.has(s.id));

        if (unbilledStudents.length === 0) {
          return res.status(400).json({ error: `All active enrolled students already have bills generated for ${billing_month}.` });
        }

        let createdCount = 0;
        await withTransaction(async (connection) => {
          for (const student of unbilledStudents) {
            await connection.execute(`
              INSERT INTO fees (student_id, billing_month, amount, due_date, status)
              VALUES (?, ?, ?, ?, ?)
            `, [student.id, billingMonthStr, amount, due_date, status || 'unpaid']);

            createdCount++;

            if (student.user_id) {
              await connection.execute(`
                INSERT INTO notifications (user_id, type, title, message) 
                VALUES (?, 'announcement', 'New Bill Generated', ?)
              `, [
                student.user_id,
                `A new fee bill of Rs. ${Number(amount).toLocaleString()} has been generated for the month of ${billing_month}. Due Date: ${due_date}.`
              ]);
            }
          }
        });

        return res.status(201).json({ 
          success: true, 
          message: `Successfully generated ${createdCount} monthly fee bill(s) for ${billing_month}.`,
          count: createdCount 
        });
      }

      // Single Student Bill Generation
      if (!student_id || !billing_month || !amount || !due_date) {
        return res.status(400).json({ error: 'Missing required bill generation fields.' });
      }

      const billingMonthStr = `${billing_month}-01`;

      const existingBill = await safeQuery(
        'SELECT id FROM fees WHERE student_id = ? AND DATE_FORMAT(billing_month, "%Y-%m") = ? LIMIT 1',
        [student_id, billing_month]
      );

      if (existingBill && existingBill.length > 0) {
        return res.status(400).json({ error: 'Student has already been billed for this billing month.' });
      }

      await safeQuery(`
        INSERT INTO fees (student_id, billing_month, amount, due_date, status)
        VALUES (?, ?, ?, ?, ?)
      `, [student_id, billingMonthStr, amount, due_date, status || 'unpaid']);

      try {
        const studentInfo = await safeQuery('SELECT user_id FROM students WHERE id = ? LIMIT 1', [student_id]);
        if (studentInfo?.length > 0) {
          const studentUserId = studentInfo[0].user_id;
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES (?, 'announcement', 'New Bill Generated', ?)
          `, [
            studentUserId, 
            `A new fee bill of Rs. ${Number(amount).toLocaleString()} has been generated for the month of ${billing_month}. Due Date: ${due_date}.`
          ]);
        }
      } catch (notifErr) {
        console.error('Failed to write billing notification:', notifErr);
      }

      return res.status(201).json({ success: true, message: 'Fee bill generated successfully.' });
    } catch (error: any) {
      console.error('Failed to create bill:', error);
      return res.status(500).json({ error: 'Failed to generate bill: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, amount, due_date, status } = req.body;

      if (!id || !amount || !due_date || !status) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      await safeQuery(`
        UPDATE fees SET 
          amount = ?, 
          due_date = ?, 
          status = ?
        WHERE id = ?
      `, [amount, due_date, status, id]);

      return res.status(200).json({ success: true, message: 'Fee bill updated successfully.' });
    } catch (error: any) {
      console.error('Failed to update bill:', error);
      return res.status(500).json({ error: 'Failed to update bill: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Bill ID required.' });
      }

      const linkedPayments = await safeQuery(
        'SELECT id FROM payments WHERE fee_id = ? LIMIT 1',
        [id]
      );

      if (linkedPayments && linkedPayments.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete fee bill. Payments have already been processed for this bill. You must cancel those payments first.' 
        });
      }

      await safeQuery('DELETE FROM fees WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: 'Bill deleted.' });
    } catch (error: any) {
      console.error('Failed to delete bill:', error);
      return res.status(500).json({ error: 'Failed to delete bill: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
