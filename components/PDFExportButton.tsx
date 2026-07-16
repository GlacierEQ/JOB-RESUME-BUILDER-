"use client";

import React, { useState } from "react";
import styles from "./PDFExportButton.module.css";

interface PDFExportButtonProps {
  onExport: (type: "tailored" | "comparison") => void;
  isLoading?: boolean;
}

export default function PDFExportButton({ onExport, isLoading = false }: PDFExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [exportType, setExportType] = useState<"tailored" | "comparison" | null>(null);

  const handleOpenModal = (type: "tailored" | "comparison") => {
    setExportType(type);
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsChecked(false);
    setExportType(null);
  };

  const handleConfirmReview = () => {
    if (isChecked && exportType) {
      onExport(exportType);
      handleCloseModal();
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => handleOpenModal("tailored")}
        disabled={isLoading}
      >
        Complete Tailored Resume Review
      </button>

      <button
        type="button"
        className="btn-primary"
        onClick={() => handleOpenModal("comparison")}
        disabled={isLoading}
      >
        Complete Side-by-Side Review
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalTitle}>Truthfulness verification required</div>

            <p className={styles.modalDescription}>
              Resume Shapeshifter helps you communicate authentic experience clearly. Review every proposed change before marking this run complete.
            </p>

            <div className={styles.disclaimerBox}>
              <strong>Verification boundary:</strong>
              <div style={{ marginTop: "4px" }}>
                You remain responsible for the accuracy of the final resume. Confirm employers, dates, qualifications, technical skills, and metrics against your source records.
              </div>
            </div>

            <label className={styles.checkboxContainer}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={isChecked}
                onChange={(event) => setIsChecked(event.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                I reviewed the proposed changes and confirmed that they accurately represent my experience.
              </span>
            </label>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleConfirmReview}
                disabled={!isChecked}
              >
                Confirm Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
