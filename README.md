# Multi-Departmental DPC Promotion Tracking Web Application

An automated, step-by-step Departmental Promotion Committee (DPC) workflow tracker for Kerala Government Gazetted Officers. Features tenant department isolation, custom workflow configuration, document management linked to Google Drive, and progress logs backed by Google Sheets.

## Architecture Overview

- **Frontend**: React (Vite, Zustand, React Router v7)
- **Backend API**: Google Apps Script (Web App Deployment)
- **Database**: Google Sheets (Multi-tab database structure)
- **Document Storage**: Google Drive (Automated folder hierarchy creation)

---

## Step-by-Step Installation Guide

Follow these steps to deploy and run the system on your personal Google account.

### Step 1: Create Google Sheet (Database)

1. Go to [Google Sheets](https://sheets.google.com) and create a **blank spreadsheet**.
2. Name the sheet (e.g., `DPC Promotion Tracker DB`).
3. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/ SPREADSHEET_ID_HERE /edit`

### Step 2: Set Up Google Apps Script API

1. In your Google Sheet, click **Extensions** → **Apps Script**.
2. Delete any default code in the editor.
3. In the project directory under [apps-script](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/), you will find 7 files. Create matching files in the Apps Script editor and copy their contents:
   - [Code.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Code.gs) (Router & Setup)
   - [Auth.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Auth.gs) (Authentication)
   - [Dashboard.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Dashboard.gs) (Dashboard operations)
   - [Workflow.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Workflow.gs) (Custom workflows)
   - [Documents.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Documents.gs) (Google Drive links)
   - [Admin.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Admin.gs) (User management)
   - [Setup.gs](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/apps-script/Setup.gs) (Initial schema builder)
4. In `Code.gs` on line 15, replace `'YOUR_GOOGLE_SHEET_ID_HERE'` with the Spreadsheet ID you copied in Step 1.
5. Save the project (click the disk icon).

### Step 3: Run the Schema Setup

1. In the Apps Script toolbar, make sure **`runSetup`** is selected in the function dropdown.
2. Click **Run**.
3. Accept the security permissions prompt (click *Advanced* → *Go to Untrusted Project* → *Allow*).
4. The script will create 5 sheet tabs (`Departments_Master`, `Users`, `Master_Dashboard`, `Step_Logs`, `Workflow_Config`) and pre-populate the **Department of Agriculture, Kerala** with 4 cadres and 12 standard workflow steps.
5. Existing users will have their password set to `password123`. A default Super Admin user is created:
   - **Email/User ID**: `admin@example.com`
   - **Password**: `admin123`

### Step 4: Deploy the Backend API

1. In Apps Script, click **Deploy** (top right) → **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Configure the fields:
   - **Description**: `DPC API v1`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Note: Secure session token check is enforced for all calls)*
4. Click **Deploy**.
5. Copy the **Web App URL** (ends in `/exec`).

### Step 5: Configure and Run Frontend

1. Create a `.env` file in the root React directory (copy from [.env.example](file:///C:/Users/HP/.gemini/antigravity/scratch/dpc-tracker/.env.example)):
   ```env
   VITE_GAS_URL=YOUR_APPS_SCRIPT_WEB_APP_URL_HERE
   ```
2. Run command:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
4. Log in using the default credentials:
   - **User ID/Email**: `admin@example.com`
   - **Password**: `admin123`

---

## Google Sheet Database Tabs

The database holds 5 primary tables:

1. **`Departments_Master`**: Registry of departments onboarded.
2. **`Users`**: Registry of personnel emails, names, passwords, roles, and department IDs.
3. **`Master_Dashboard`**: Row-wise CADRE progress summaries per year.
4. **`Step_Logs`**: Step statuses, completion logs, Drive links, and remarks.
5. **`Workflow_Config`**: Step order template configurations.

---

## Verification & Testing Checklist

- [x] **Auth Check**: Logs in via custom User ID (email) and Password, verifies against sheet credentials, registers session token.
- [x] **Dashboard Card Visuals**: Displays progress bars showing completed, pending, and not started steps.
- [x] **Step status transitions**: Updating statuses auto-records timestamps in the Sheet and updates the progress.
- [x] **Google Drive Upload**: Creates nested directory structural folders `[DeptName]/Promotions_[Year]/[Cadre]/` dynamically and returns direct file urls.
- [x] **Admin configurations**: Ability to add steps, delete steps, re-order milestones, and manage cadres.
- [x] **Isolation**: Users from different departments cannot view cross-tenant information.
