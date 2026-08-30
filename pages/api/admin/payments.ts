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
      let payments;

      if (session.user.role === 'instructor') {
        let sql = `
          SELECT
            p.id,
            p.fee_id,
            p.amount_paid,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i') as payment_date,
            p.payment_method,
            p.transaction_reference,
            p.receipt_number,
            DATE_FORMAT(f.billing_month, '%Y-%m') as billing_month,
            f.amount as bill_amount,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            s.id as student_id
          FROM payments p
          JOIN fees f ON p.fee_id = f.id
          JOIN students s ON f.student_id = s.id
          WHERE f.student_id IN (
            SELECT DISTINCT ce.student_id 
            FROM class_enrollments ce
            JOIN classes c ON ce.class_id = c.id
            JOIN instructors i ON c.instructor_id = i.id
            WHERE i.user_id = ? AND ce.status = 'enrolled'
          )
        `;
        const params: any[] = [session.user.id];

        if (month) {
          sql += ` AND (DATE_FORMAT(f.billing_month, '%Y-%m') = ? OR DATE_FORMAT(p.payment_date, '%Y-%m') = ?)`;
          params.push(month, month);
        }

        sql += ` ORDER BY p.payment_date DESC`;
        payments = await safeQuery(sql, params);
      } else {
        let sql = `
          SELECT 
            p.id,
            p.fee_id,
            p.amount_paid,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i') as payment_date,
            p.payment_method,
            p.transaction_reference,
            p.receipt_number,
            DATE_FORMAT(f.billing_month, '%Y-%m') as billing_month,
            f.amount as bill_amount,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            s.id as student_id
          FROM payments p
          JOIN fees f ON p.fee_id = f.id
          JOIN students s ON f.student_id = s.id
        `;
        const params: any[] = [];

        if (month) {
          sql += ` WHERE (DATE_FORMAT(f.billing_month, '%Y-%m') = ? OR DATE_FORMAT(p.payment_date, '%Y-%m') = ?)`;
          params.push(month, month);
        }

        sql += ` ORDER BY p.payment_date DESC`;
        payments = await safeQuery(sql, params);
      }

      return res.status(200).json({ success: true, payments });
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      return res.status(500).json({ error: 'Failed to retrieve transactions: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { fee_id, student_id, billing_month, amount_paid, payment_method, transaction_reference } = req.body;

      if (!amount_paid || !payment_method) {
        return res.status(400).json({ error: 'Missing required payment entries.' });
      }

      if (!fee_id && (!student_id || !billing_month)) {
        return res.status(400).json({ error: 'Either Fee ID or Student ID & Billing Month are required.' });
      }

      // Generate a clean, unique receipt code
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const receipt_number = `RCP-${Date.now().toString().slice(-7)}-${randSuffix}`;

      let targetFeeId = fee_id;
      let targetStudentId = student_id;
      let targetBillingMonth = billing_month;

      await withTransaction(async (connection) => {
        // If fee_id is missing, find or create the fee bill on the fly
        if (!targetFeeId) {
          const billingMonthStr = `${billing_month}-01`;
          const dueDateStr = `${billing_month}-10`;

          const [existingFee]: any = await connection.execute(
            'SELECT id, status FROM fees WHERE student_id = ? AND DATE_FORMAT(billing_month, "%Y-%m") = ? LIMIT 1',
            [student_id, billing_month]
          );

          if (existingFee && existingFee.length > 0) {
            if (existingFee[0].status === 'paid') {
              throw new Error('This fee bill has already been fully paid.');
            }
            targetFeeId = existingFee[0].id;
          } else {
            const [newFeeResult]: any = await connection.execute(
              `INSERT INTO fees (student_id, billing_month, amount, due_date, status) VALUES (?, ?, ?, ?, 'paid')`,
              [student_id, billingMonthStr, amount_paid, dueDateStr]
            );
            targetFeeId = newFeeResult.insertId;
          }
        } else {
          // If fee_id was provided, verify it exists and is unpaid
          const [feeDetails]: any = await connection.execute(
            'SELECT status, amount, student_id, DATE_FORMAT(billing_month, "%Y-%m") as billing_month FROM fees WHERE id = ? LIMIT 1',
            [targetFeeId]
          );

          if (!feeDetails || feeDetails.length === 0) {
            throw new Error('Target fee bill not found.');
          }

          if (feeDetails[0].status === 'paid') {
            throw new Error('This fee bill has already been fully paid.');
          }

          targetStudentId = feeDetails[0].student_id;
          targetBillingMonth = feeDetails[0].billing_month;
        }

        // Verify instructor permissions for this student if instructor role
        if (session.user.role === 'instructor') {
          const [studentAccess]: any = await connection.execute(`
            SELECT 1 FROM class_enrollments ce
            JOIN classes c ON ce.class_id = c.id
            JOIN instructors i ON c.instructor_id = i.id
            WHERE ce.student_id = ? AND i.user_id = ? AND ce.status = 'enrolled'
            LIMIT 1
          `, [targetStudentId, session.user.id]);

          if (!studentAccess || studentAccess.length === 0) {
            throw new Error('Access denied: You can only record payments for students enrolled in your assigned classes.');
          }
        }

        // 1. Insert payment entry
        await connection.execute(`
          INSERT INTO payments (fee_id, amount_paid, payment_method, transaction_reference, receipt_number) 
          VALUES (?, ?, ?, ?, ?)
        `, [targetFeeId, amount_paid, payment_method, transaction_reference?.trim() || null, receipt_number]);

        // 2. Ensure fee bill status is marked 'paid'
        await connection.execute(
          "UPDATE fees SET status = 'paid' WHERE id = ?",
          [targetFeeId]
        );

        // 3. Write student notification inside transaction
        const [studentUser]: any = await connection.execute(
          'SELECT user_id FROM students WHERE id = ? LIMIT 1',
          [targetStudentId]
        );
        const studentUserId = studentUser[0]?.user_id;

        if (studentUserId) {
          await connection.execute(`
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES (?, 'announcement', 'Payment Received', ?)
          `, [
            studentUserId, 
            `Your payment of Rs. ${Number(amount_paid).toLocaleString()} for month ${targetBillingMonth} has been received. Receipt: ${receipt_number}. Thank you!`
          ]);
        }
      });

      return res.status(201).json({ success: true, message: 'Payment recorded successfully.', receipt_number });
    } catch (error: any) {
      console.error('Failed to log payment:', error);
      return res.status(500).json({ error: error.message || 'Failed to process payment.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
