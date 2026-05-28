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

  const handleConfirmExport = () => {
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
        📥 Download Tailored Resume PDF
      </button>

      <button 
        type="button" 
        className="btn-primary" 
        onClick={() => handleOpenModal("comparison")}
        disabled={isLoading}
      >
        📄 Export Side-by-Side Proof PDF
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              ⚠️ Truthfulness Verification required
            </div>

            <p className={styles.modalDescription}>
              Resume Shapeshifter is designed to help you communicate your authentic experience clearly.
              Before downloading your generated resume documents, please review the rewritten content.
            </p>

            <div className={styles.disclaimerBox}>
              <strong>Important Disclaimer:</strong>
              <div style={{ marginTop: "4px" }}>
                You are legally and professionally responsible for the accuracy of your resume.
                Do not submit resumes containing fabricated employers, dates, qualifications, or metrics.
                Ensure all technical skills match your actual capabilities.
              </div>
            </div>

            <label className={styles.checkboxContainer}>
              <input 
                type="checkbox" 
                className={styles.checkbox}
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                I have verified all tailored bullet points and confirm that they truthfully represent my actual experience.
              </span>
            </label>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.confirmBtn} 
                onClick={handleConfirmExport}
                disabled={!isChecked}
              >
                Verify & Export Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
