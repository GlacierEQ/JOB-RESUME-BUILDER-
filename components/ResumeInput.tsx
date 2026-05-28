"use client";

import React, { useState, useRef } from "react";
import styles from "./ResumeInput.module.css";
import { mockResume } from "@/lib/mockData";

interface ResumeInputProps {
  value: string;
  onChange: (val: string) => void;
  onFileParsed?: (parsedText: string) => void;
}

export default function ResumeInput({ value, onChange, onFileParsed }: ResumeInputProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadDemo = () => {
    // Convert mockResume into readable text representation to paste into textarea
    const summaryText = `SUMMARY:\n${mockResume.summary}\n\n`;
    const skillsText = `SKILLS:\n${mockResume.skills.join(", ")}\n\n`;
    const experienceText = `EXPERIENCE:\n` + mockResume.experience.map(exp => 
      `${exp.company} - ${exp.title} (${exp.startDate} - ${exp.endDate})\n` +
      exp.bullets.map(b => `• ${b}`).join("\n")
    ).join("\n\n") + "\n\n";
    
    const projectsText = `PROJECTS:\n` + mockResume.projects.map(proj =>
      `${proj.name}\n${proj.description}\n` +
      proj.bullets.map(b => `• ${b}`).join("\n")
    ).join("\n\n") + "\n\n";
    
    const educationText = `EDUCATION:\n` + mockResume.education.map(edu =>
      `${edu.degree} in ${edu.fieldOfStudy}, ${edu.institution} (${edu.graduationDate})`
    ).join("\n");

    const fullDemoText = `${summaryText}${skillsText}${experienceText}${projectsText}${educationText}`;
    onChange(fullDemoText);
    setFileName(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setFileName(file.name);
    // In mock Mode, we simulate file parsing after a tiny load state
    if (onFileParsed) {
      // Simulate reading the file contents
      const reader = new FileReader();
      reader.onload = (e) => {
        // Here we just notify about the file being added, and load mock data
        // to represent the parsed result for visual fidelity
        const summaryText = `SUMMARY:\n${mockResume.summary}\n\n`;
        const skillsText = `SKILLS:\n${mockResume.skills.join(", ")}\n\n`;
        const experienceText = `EXPERIENCE:\n` + mockResume.experience.map(exp => 
          `${exp.company} - ${exp.title} (${exp.startDate} - ${exp.endDate})\n` +
          exp.bullets.map(b => `• ${b}`).join("\n")
        ).join("\n\n");
        onFileParsed(`${summaryText}${skillsText}${experienceText}`);
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          Original Resume <span className={styles.badge}>Paste or Upload</span>
        </div>
        <button type="button" className={styles.loadBtn} onClick={handleLoadDemo}>
          Load Sample Resume
        </button>
      </div>

      <div 
        className={styles.uploadArea}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
        />
        <div className={styles.uploadIcon}>📎</div>
        <div className={styles.uploadText}>
          {fileName ? "Change selected file" : "Drag and drop your resume file here or click to browse"}
        </div>
        <div className={styles.uploadSubtext}>Supports PDF, DOCX, and TXT (Max 5MB)</div>
      </div>

      {fileName && (
        <div className={styles.fileList}>
          <div className={styles.fileItem}>
            <span className={styles.fileName}>📄 {fileName}</span>
            <button type="button" className={styles.removeFile} onClick={handleRemoveFile}>
              Remove
            </button>
          </div>
        </div>
      )}

      <textarea
        className={styles.textarea}
        placeholder="Or paste your plain text resume content here... e.g.
Alex Mercer
alex.mercer@email.com
Experience:
- Software Engineer at TechNova...
- Junior Developer at PixelCraft..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
