import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function LoadingCard() {
  return (
    <motion.div 
      className="h-full flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
      <span className="ml-2 text-sm text-gray-600">Loading insights...</span>
    </motion.div>
  );
}