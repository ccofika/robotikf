// Detalj radnog naloga preko liste (ruta /work-orders/:id sa backgroundLocation): preko celog ekrana kao ranije,
// u izgledu Security dela. Zatvara se dugmetom Nazad u detalju ili Escape-om.
// Escape ide kroz sx sloj (useLayer): dok je iznad otvoren dijalog iz detalja, zatvara se samo on.
import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayer } from '../security/sx/layer';
import WorkOrderDetail from '../pages/WorkOrders/WorkOrderDetail';
import './WorkOrderModal.mx.css';

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

  useLayer(true, closeModal);

  return (
    <div className="mx-wom" role="dialog" aria-modal="true" aria-label="Radni nalog" data-testid="work-order-modal">
      <div className="mx-wom__body">
        <WorkOrderDetail isModal={true} onCloseModal={closeModal} modalWorkOrderId={workOrderId} />
      </div>
    </div>
  );
};

export default WorkOrderModal;
