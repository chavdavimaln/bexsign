import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CompletedDocumentViewer from '../components/CompletedDocumentViewer';

/** Sender's view of a request in any status: all documents, all recipients and their fields and signatures. */
export default function DocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <CompletedDocumentViewer
      key={id}
      doc={{ id }}
      mode="sender"
      onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/documents'))}
    />
  );
}
