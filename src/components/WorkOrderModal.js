// Detalj radnog naloga preko liste (ruta /work-orders/:id sa backgroundLocation): široka fioka sa desne
// strane, na telefonu list preko celog ekrana. Lista ostaje ispod. Zatvara se dugmetom X, klikom van fioke
// ili Escape-om (samo gornji sloj, sx layer koji zaključava i skrol stranice).
import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
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
    <div className="mx-wom" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }} data-testid="work-order-modal">
      <div className="mx-wom__panel" role="dialog" aria-modal="true" aria-label="Radni nalog">
        <div className="mx-wom__head">
          <span className="sx-eyebrow">Radni nalog</span>
          <button type="button" className="sx-dialog__close mx-wom__close" onClick={closeModal} aria-label="Zatvori" data-testid="work-order-modal-close">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="mx-wom__body">
          <WorkOrderDetail isModal={true} onCloseModal={closeModal} modalWorkOrderId={workOrderId} />
        </div>
      </div>
    </div>
  );
};

export default WorkOrderModal;
