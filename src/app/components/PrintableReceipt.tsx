'use client';

import React, { forwardRef } from 'react';
import { FaCheckCircle, FaCreditCard, FaMoneyBill } from 'react-icons/fa';

interface PrintableReceiptProps {
  receiptNumber: string;
  paymentId: number;
  student: {
    id: number;
    name: string;
    school?: string;
    contact_number?: string;
  };
  className: string;
  paidMonth: string;
  paidYear: string;
  amount: number;
  status: string;
  paymentMethod?: 'cash' | 'card';
  isHalfPayment?: boolean;
  remainingAmount?: number;
  balanceDueDate?: string;
}

const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(({
  receiptNumber,
  paymentId,
  student,
  className,
  paidMonth,
  paidYear,
  amount,
  status,
  paymentMethod = 'cash',
  isHalfPayment,
  remainingAmount,
  balanceDueDate,
}, ref) => (
  <div
    ref={ref}
    className="bg-white rounded-lg shadow-lg border border-gray-300 p-3 text-gray-800"
    style={{
      fontFamily: 'monospace',
      fontSize: '16px',
      width: '80mm',
      minWidth: '80mm',
      maxWidth: '80mm',
      boxSizing: 'border-box',
      marginTop: '0', // Reduce top space when printing
    }}
  >
    <div style={{ textAlign: 'center' }} className="mb-2">
      <img
        src="/Goal Learning Institute transparent.png"
        alt="GOAL Learning Institute"
        className="mb-1"
        style={{ 
          width: '45mm',
          maxWidth: '100%', 
          height: 'auto',
          display: 'block',
          margin: '0 auto'
        }}
      />
      <div className="text-sm text-gray-600 font-semibold">Receipt</div>
    </div>
    <hr className="my-2 border-dashed border-gray-300" />
    <div className="flex justify-between mb-2">
      <span>Receipt No:</span>
      <span className="font-bold">{receiptNumber}</span>
    </div>
    <div className="flex justify-between mb-2">
      <span>Payment ID:</span>
      <span>{paymentId}</span>
    </div>
    <div className="flex justify-between mb-2">
      <span>Date:</span>
      <span>{new Date().toLocaleDateString()}</span>
    </div>
    <hr className="my-2 border-dashed border-gray-300" />
    <div className="mb-2">
      <span className="font-semibold">Student:</span>
      <span className="ml-2">{student.name} (ID: {student.id})</span>
    </div>
    <div className="mb-2">
      <span className="font-semibold">Class:</span>
      <span className="ml-2">{className}</span>
    </div>
    <div className="mb-2">
      <span className="font-semibold">Month:</span>
      <span className="ml-2">{paidMonth} {paidYear}</span>
    </div>
    <hr className="my-2 border-dashed border-gray-300" />
    <div className="flex justify-between mb-2">
      <span className="font-semibold">Amount:</span>
      <span className="font-bold text-xl">Rs. {Number(amount).toFixed(2)}</span>
    </div>
    <div className="flex justify-between mb-2">
      <span>Payment Method:</span>
      <span className="flex items-center">
        {paymentMethod === 'cash' ? (
          <FaMoneyBill className="text-green-600 mr-1 text-lg" />
        ) : (
          <FaCreditCard className="text-blue-600 mr-1 text-lg" />
        )}
        <span className="font-semibold capitalize">{paymentMethod}</span>
      </span>
    </div>
    <div className="flex justify-between mb-2">
      <span>Status:</span>
      <span className="flex items-center">
        <span className="font-semibold mr-1">{status}</span>
        <FaCheckCircle className="text-green-500 text-lg" />
      </span>
    </div>
    {isHalfPayment && (
      <>
        <hr className="my-2 border-dashed border-gray-300" />
        <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
          <div className="text-xs font-bold text-yellow-800 mb-1">Half Payment</div>
          <div className="flex justify-between text-xs">
            <span>Remaining Balance:</span>
            <span className="font-bold">Rs. {remainingAmount?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Due Date:</span>
            <span className="font-bold">{new Date(balanceDueDate || '').toLocaleDateString()}</span>
          </div>
        </div>
      </>
    )}
    <hr className="my-2 border-dashed border-gray-300" />
    <div className="mt-2" style={{ textAlign: 'center' }}>
      <div className="mb-1 font-semibold text-sm text-gray-600">Thank you for your payment!</div>
      <div className="text-blue-700 font-semibold text-sm">
        <div>0767342733</div>
        <div>0814118414</div>
        <div>goalinstitute@hotmail.com</div>
      </div>
    </div>
  </div>
));

PrintableReceipt.displayName = 'PrintableReceipt';

export default PrintableReceipt;
