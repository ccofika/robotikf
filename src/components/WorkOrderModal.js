import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkOrderDetail from '../pages/WorkOrders/WorkOrderDetail';

const WorkOrderModal = ({ backgroundLocation }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract work order ID from current URL path
  const match = location.pathname.match(/\/work-orders\/([a-f0-9]+)/i);
  const workOrderId = match ? match[1] : null;

  const closeModal = useCallback(() => {
    navigate(backgroundLocation.pathname + backgroundLocation.search, {
      replace: true,
      state: {
        ...backgroundLocation.state,
        _modalClosed: true,
        _dataChanged: true
      }
    });
  }, [navigate, backgroundLocation]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
      {/* Full-screen content with scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <WorkOrderDetail isModal={true} onCloseModal={closeModal} modalWorkOrderId={workOrderId} />
      </div>
    </div>
  );
};

export default WorkOrderModal;
