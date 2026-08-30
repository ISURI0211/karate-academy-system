import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin role required' });
    }

    // 1. Fetch total active students
    const activeStudentsResult = await safeQuery(
      "SELECT COUNT(*) as count FROM students WHERE enrollment_status = 'active'"
    );
    const totalStudents = activeStudentsResult[0]?.count || 0;

    // 2. Fetch active instructors
    const instructorsResult = await safeQuery(
      "SELECT COUNT(*) as count FROM instructors"
    );
    const totalInstructors = instructorsResult[0]?.count || 0;

    // 3. Fetch classes scheduled
    const classesResult = await safeQuery(
      "SELECT COUNT(*) as count FROM classes"
    );
    const totalClasses = classesResult[0]?.count || 0;

    // 4. Fetch revenue (total payments)
    const paymentsResult = await safeQuery(
      "SELECT SUM(amount_paid) as revenue FROM payments"
    );
    const totalRevenue = paymentsResult[0]?.revenue || 0;

    // 5. Fetch belt distribution
    const beltDistributionResult = await safeQuery(
      "SELECT belt_rank as name, COUNT(*) as value FROM students GROUP BY belt_rank"
    );

    const beltData = beltDistributionResult.map((row: any) => ({
      name: row.name,
      value: Number(row.value)
    }));

    const finalBeltData = beltData.length > 0 ? beltData : [
      { name: 'White', value: 1 },
      { name: 'Yellow', value: 0 },
      { name: 'Orange', value: 0 },
      { name: 'Green', value: 0 },
      { name: 'Blue', value: 0 },
      { name: 'Purple', value: 0 },
      { name: 'Brown', value: 0 },
      { name: 'Black', value: 0 }
    ];

    // 6. Fetch Karate Skill Evaluations Benchmark (Core 4 Karate Pillars)
    const evalResult = await safeQuery(`
      SELECT 
        ROUND(AVG(technique_score), 1) as avgTechnique,
        ROUND(AVG(spar_score), 1) as avgSparring,
        ROUND(AVG(fitness_score), 1) as avgFitness,
        ROUND(AVG(discipline_score), 1) as avgDiscipline,
        COUNT(*) as totalEvaluations
      FROM performance_evaluations
    `);

    const avgTechnique = evalResult[0]?.avgTechnique ? Number(evalResult[0].avgTechnique) : 8.2;
    const avgSparring = evalResult[0]?.avgSparring ? Number(evalResult[0].avgSparring) : 7.6;
    const avgFitness = evalResult[0]?.avgFitness ? Number(evalResult[0].avgFitness) : 8.5;
    const avgDiscipline = evalResult[0]?.avgDiscipline ? Number(evalResult[0].avgDiscipline) : 9.0;
    const totalEvaluations = evalResult[0]?.totalEvaluations ? Number(evalResult[0].totalEvaluations) : 0;

    const skillRadarData = [
      { subject: 'Kihon & Kata', score: avgTechnique, fullMark: 10 },
      { subject: 'Kumite (Sparring)', score: avgSparring, fullMark: 10 },
      { subject: 'Conditioning', score: avgFitness, fullMark: 10 },
      { subject: 'Reigi (Discipline)', score: avgDiscipline, fullMark: 10 },
    ];

    // Tiered Belt Proficiency Breakdown
    const tierResult = await safeQuery(`
      SELECT 
        CASE 
          WHEN s.belt_rank IN ('White', 'Yellow', 'Orange') THEN 'Beginner Belts'
          WHEN s.belt_rank IN ('Green', 'Blue', 'Purple') THEN 'Intermediate Belts'
          ELSE 'Advanced Belts'
        END as tier,
        ROUND(AVG(pe.technique_score), 1) as Technique,
        ROUND(AVG(pe.spar_score), 1) as Sparring,
        ROUND(AVG(pe.fitness_score), 1) as Fitness,
        ROUND(AVG(pe.discipline_score), 1) as Discipline
      FROM performance_evaluations pe
      JOIN students s ON pe.student_id = s.id
      GROUP BY tier
    `);

    const skillTierData = tierResult.length > 0 ? tierResult.map((row: any) => ({
      tier: row.tier,
      Technique: Number(row.Technique),
      Sparring: Number(row.Sparring),
      Fitness: Number(row.Fitness),
      Discipline: Number(row.Discipline),
    })) : [
      { tier: 'Beginner Belts', Technique: 7.2, Sparring: 6.8, Fitness: 7.5, Discipline: 8.4 },
      { tier: 'Intermediate Belts', Technique: 8.1, Sparring: 7.6, Fitness: 8.3, Discipline: 8.9 },
      { tier: 'Advanced Belts', Technique: 9.2, Sparring: 8.8, Fitness: 9.1, Discipline: 9.6 },
    ];

    // 7. Fetch fee overview
    const feeResult = await safeQuery(`
      SELECT 
        DATE_FORMAT(billing_month, '%b') as month, 
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as Collected, 
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as Overdue 
      FROM fees 
      GROUP BY DATE_FORMAT(billing_month, '%Y-%m'), DATE_FORMAT(billing_month, '%b') 
      ORDER BY DATE_FORMAT(billing_month, '%Y-%m') ASC 
      LIMIT 6
    `);

    const finalFinancialData = feeResult.length > 0
      ? feeResult.map((row: any) => ({
          month: row.month,
          Collected: Number(row.Collected),
          Overdue: Number(row.Overdue)
        }))
      : [
          { month: 'Jan', Collected: 80, Overdue: 0 },
          { month: 'Feb', Collected: 80, Overdue: 80 },
          { month: 'Mar', Collected: 160, Overdue: 0 },
          { month: 'Apr', Collected: 240, Overdue: 80 },
          { month: 'May', Collected: 320, Overdue: 160 },
          { month: 'Jun', Collected: 400, Overdue: 240 },
        ];

    // 8. Fetch recent system logs/notifications
    const systemNotifications = await safeQuery(`
      SELECT 
        title, 
        message as \`desc\`, 
        type, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as time 
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalInstructors,
        totalClasses,
        totalRevenue
      },
      beltData: finalBeltData,
      skillStats: {
        avgTechnique,
        avgSparring,
        avgFitness,
        avgDiscipline,
        totalEvaluations,
        overallIndex: Number(((avgTechnique + avgSparring + avgFitness + avgDiscipline) / 4).toFixed(1)),
        radarData: skillRadarData,
        tierData: skillTierData
      },
      financialData: finalFinancialData,
      alerts: systemNotifications
    });

  } catch (error: any) {
    console.error('💥 Dashboard Stats API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve dashboard stats', 
      error: error.message 
    });
  }
}
