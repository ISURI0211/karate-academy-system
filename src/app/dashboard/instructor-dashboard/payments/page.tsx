'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaMoneyBillWave, FaSearch, FaTimes, FaSpinner, 
  FaCheckCircle, FaReceipt, FaCheck, FaCoins, FaExclamationCircle, FaChartLine
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface FeeBill {
  id: number | null;
  student_id: number;
  billing_month: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'unbilled';
  student_name: string;
  belt_rank: string;
  joining_date?: string;
}

interface PaymentTransaction {
  id: number;
  fee_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online';
  transaction_reference: string | null;
  receipt_number: string;
  billing_month: string;
  bill_amount: number;
  student_name: string;
  student_id?: number;
}

const getLocalMonthString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export default function InstructorPaymentsPage() {
  const { data: session } = useSession();
  const [bills, setBills] = useState<FeeBill[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Month & Filter states
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthString());
  const [useMonthFilter, setUseMonthFilter] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'bills' | 'transactions'>('bills');

  // Modal states
  const [mounted, setMounted] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<FeeBill | null>(null);

  // Record Payment form
  const [payForm, setPayForm] = useState({
    amount_paid: 1500,
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'online',
    transaction_reference: ''
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

  const loadBills = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const monthQuery = useMonthFilter ? `?month=${selectedMonth}` : '';
      const res = await fetch(`/api/admin/fees${monthQuery}`);
      const data = await res.json();
      if (data.success) {
        setBills(data.fees || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve bills.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with fees database.');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const monthQuery = useMonthFilter ? `?month=${selectedMonth}` : '';
      const res = await fetch(`/api/admin/payments${monthQuery}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadBills();
    loadTransactions();
  }, [selectedMonth, useMonthFilter]);

  // Auto-dismiss success notification after 10 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleOpenPaymentModal = (bill: FeeBill) => {
    setSelectedBill(bill);
    setPayForm({
      amount_paid: Number(bill.amount || 1500),
      payment_method: 'cash',
      transaction_reference: ''
    });
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    setPaySubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fee_id: selectedBill.id,
          student_id: selectedBill.student_id,
          billing_month: selectedBill.billing_month,
          ...payForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Payment recorded successfully. Receipt code: ${data.receipt_number}`);
        setPaymentModalOpen(false);
        loadBills();
        loadTransactions();
      } else {
        setErrorMsg(data.error || 'Failed to log payment.');
      }
    } catch (err) {
      setErrorMsg('Failed to log payment transaction.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Financial Metrics calculations
  const totalBilledAmount = bills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalCollectedAmount = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const pendingAmount = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue' || b.status === 'unbilled').reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const paidCount = bills.filter(b => b.status === 'paid').length;
  const collectionRate = bills.length > 0 ? Math.round((paidCount / bills.length) * 100) : 0;

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.student_name.toLowerCase().includes(search.toLowerCase()) ||
      String(bill.student_id).includes(search);
    const matchesStatus = statusFilter === 'All' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = transactions.filter(t => 
    t.student_name.toLowerCase().includes(search.toLowerCase()) ||
    t.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
    (t.student_id && String(t.student_id).includes(search))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'overdue':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'unbilled':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'unpaid':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const formatMonthDisplay = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaMoneyBillWave className="text-amber-500" /> Student Payments Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">Record fee payments and review receipts for students enrolled in your assigned classes</p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <FaTimes className="text-rose-500 flex-shrink-0" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <FaCheckCircle className="text-emerald-500 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {/* Monthly Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base flex-shrink-0">
            <FaMoneyBillWave />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Billed Roster</p>
            <p className="text-base font-black text-slate-800 tabular-nums">Rs. {totalBilledAmount.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-medium">{bills.length} student{bills.length !== 1 ? 's' : ''} {useMonthFilter ? `in ${formatMonthDisplay(selectedMonth)}` : 'total'}</p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base flex-shrink-0">
            <FaCoins />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</p>
            <p className="text-base font-black text-emerald-600 tabular-nums">Rs. {totalCollectedAmount.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-medium">{paidCount} paid bill{paidCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-base flex-shrink-0">
            <FaExclamationCircle />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending / Unbilled</p>
            <p className="text-base font-black text-rose-600 tabular-nums">Rs. {pendingAmount.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-medium">{bills.length - paidCount} uncollected bill{bills.length - paidCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-base flex-shrink-0">
            <FaChartLine />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Rate</p>
            <p className="text-base font-black text-slate-800 tabular-nums">{collectionRate}%</p>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${collectionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Month Selection */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billing Month</label>
            <button
              onClick={() => setUseMonthFilter(!useMonthFilter)}
              className="text-[9px] font-bold text-amber-600 hover:text-amber-700 uppercase"
            >
              {useMonthFilter ? 'Show All Months' : 'Filter Month'}
            </button>
          </div>
          <input
            type="month"
            disabled={!useMonthFilter}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Search Input */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Search Student or ID</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FaSearch size={11} />
            </span>
            <input
              type="text"
              placeholder={activeTab === 'bills' ? 'Search by student name or ID...' : 'Search by student, ID, or receipt code...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bill Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="unbilled">Unbilled</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-slate-100 flex gap-4 text-xs font-bold">
        <button
          onClick={() => { setActiveTab('bills'); setSearch(''); }}
          className={`pb-2.5 transition-colors border-b-2 px-1 ${
            activeTab === 'bills' 
              ? 'border-amber-500 text-slate-800' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Assigned Students Monthly Bills ({filteredBills.length})
        </button>
        <button
          onClick={() => { setActiveTab('transactions'); setSearch(''); }}
          className={`pb-2.5 transition-colors border-b-2 px-1 ${
            activeTab === 'transactions' 
              ? 'border-amber-500 text-slate-800' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Receipts Log ({filteredTransactions.length})
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-lg text-amber-500" />
          <span className="text-xs font-bold">Loading payment records...</span>
        </div>
      ) : activeTab === 'bills' ? (
        filteredBills.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Billing Month</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBills.map((bill, idx) => (
                    <tr key={bill.id || `unbilled-${bill.student_id}-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 leading-tight">{bill.student_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            ID: #{bill.student_id}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400">Belt: {bill.belt_rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600">{bill.billing_month}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-800 tabular-nums">Rs. {Number(bill.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{bill.due_date}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {bill.status !== 'paid' && (
                          <button
                            onClick={() => handleOpenPaymentModal(bill)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm uppercase tracking-wider"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-12 bg-white rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-400">No fee bills found matching criteria for your assigned classes.</p>
          </div>
        )
      ) : (
        filteredTransactions.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Receipt Details</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Paid Month</th>
                    <th className="px-6 py-4">Amount Paid</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-1.5">
                        <FaReceipt className="text-amber-500 flex-shrink-0" />
                        <span>{tx.receipt_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{tx.student_name}</p>
                        {tx.student_id && (
                          <span className="text-[10px] font-mono font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                            ID: #{tx.student_id}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">{tx.billing_month}</td>
                      <td className="px-6 py-4 font-black text-slate-800 tabular-nums">Rs. {Number(tx.amount_paid).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold uppercase text-[9px] tracking-wider text-slate-500">
                        {tx.payment_method.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{tx.payment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-12 bg-white rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-400">No receipt transactions logged.</p>
          </div>
        )
      )}

      {/* Record Payment Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {paymentModalOpen && selectedBill && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Record Fee Payment</h3>
                  <button
                    onClick={() => setPaymentModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                  {/* Bill Details Info */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bill Reference</p>
                    <p className="text-xs font-bold text-slate-800">{selectedBill.student_name} (ID: #{selectedBill.student_id})</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      Billing Month: {selectedBill.billing_month} | Status: <span className="uppercase font-bold">{selectedBill.status}</span>
                    </p>
                  </div>

                  {/* Amount Paid */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Amount Paid (Rs.)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={payForm.amount_paid}
                      onChange={(e) => setPayForm({ ...payForm, amount_paid: Number(e.target.value) })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={payForm.payment_method}
                      onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all"
                    >
                      <option value="cash">Cash Payment</option>
                      <option value="card">Card Reader</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online Payment</option>
                    </select>
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Transaction Reference / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bank slip transaction ref code"
                      value={payForm.transaction_reference}
                      onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Submit Panel */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={paySubmitting}
                      className="px-5 py-2 bg-slate-900 hover:bg-amber-650 disabled:opacity-65 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2"
                    >
                      {paySubmitting ? <FaSpinner className="animate-spin" size={10} /> : null} Record Receipt
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
