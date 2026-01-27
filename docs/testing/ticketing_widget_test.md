# Test Report: Ticketing Widget
**Scope:** Screen Capture, Drawing, Submission

## 1. Functional Testing
- **Unit Testing:** 
    - Canvas coordinate transformation logic for mobile touch.
    - Status: ✅ **Passed**
- **Integration Testing:** 
    - Image base64 decoding and storage on the server.
    - Status: ✅ **Passed**
- **End-to-End (E2E):** 
    - Opening widget -> Annotating -> Submitting -> Verifying in SA Portal.
    - Status: ✅ **Passed**
- **Regression Testing:** 
    - Verified that annotation tools don't interfere with main app scrolling.
    - Status: ✅ **Passed**

## 2. Non-Functional Testing
- **Performance Testing:** 
    - Time to capture viewport: < 500ms.
    - Status: ✅ **Passed**
- **Browser Testing:** 
    - Verified `html-to-image` rendering on Chrome, Firefox, and Safari.
    - Status: 🟢 **Active** (Firefox has occasional font glitches)
- **Accessibility Testing:** 
    - ARIA labels on all annotation tools (Pencil, Eraser, etc.).
    - Status: ✅ **Passed**

## 3. Specialized Testing
- **Exploratory Testing:** 
    - Attempting to submit a ticket without a subject (Correctly Blocked).
    - Status: ✅ **Passed**
- **Static Testing:** 
    - Security audit of file upload logic to prevent PHP execution in `uploads/`.
    - Result: Directory protected via `.htaccess`, file extensions forced to `.jpg`.
    - Status: ✅ **Passed**
