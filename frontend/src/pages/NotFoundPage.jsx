import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

// Route: catch-all "*" in routes/AppRoutes.jsx — matches any unrecognized path.
function NotFoundPage() {
  usePageTitle('Page Not Found');
  
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md text-center"
      >
        <div className="relative mx-auto mb-2 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-accent-blue/10" />
          <SearchX size={30} className="relative text-accent-blue" />
        </div>

        <div className="mt-4 font-display text-[80px] font-bold leading-none tracking-[-0.03em] text-page-ink">
          404
        </div>

        <h1 className="mt-2 font-display text-[22px] font-semibold text-page-ink">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-xs font-sans text-[14px] leading-[1.6] text-page-muted">
          The page you're looking for doesn't exist or may have moved.
        </p>

        <Link
          to="/home"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-accent-blue px-6 py-2.5 font-sans text-[14px] font-medium text-white transition-colors hover:bg-accent-blue-hover"
        >
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}

export default NotFoundPage;