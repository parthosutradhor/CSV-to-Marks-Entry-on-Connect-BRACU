    # Fill Marks from CSV — v1.0.0 (MV3)

    Chrome extension to add a CSV uploader to BRACU Connect's **Final Mark Entry** page and auto-fill marks from your CSV.

    ---

    ## ✍️ Author
    **Partho Sutra Dhor** — Lecturer in Mathematics, BRAC University  
    Email: parthosutradhor@gmail.com

    ## 🚀 Features
    - One-click **panel injection** with a CSV uploader
    - Flexible **column mapping** via dropdowns (ID / Name / Final / Total)
    - **Skip rows** option to ignore header lines
    - Smart **status modal** after insertion: Absent / Not in sheet / Not in connect
    - Runs **only** on the final mark entry page for safety

    ## 🔧 Panel Layout
    - **CSV → Marks Entry by Partho Sutra Dhor**
    - **Uploader**
    - **Skip rows** (textbox)
    - **ID** (dropdown, default **B**) & **Name** (dropdown, default **C**)
    - **Final** (dropdown, default **H**) & **Total** (dropdown, default **I**)
    - **Insert Marks** button

    ## 🌐 Where it runs
    The extension only runs on:
    `https://connect.bracu.ac.bd/app/exam-controller/mark-entry/final/*`

    ## 📦 Install (Developer Mode)
    1. Visit `chrome://extensions`
    2. Enable **Developer mode**
    3. Click **Load unpacked** and select this folder

    ## ▶️ Usage
    1. Open the **Final Mark Entry** page on BRACU Connect
    2. Click the extension icon to inject the panel
    3. Choose/drag your CSV
    4. Set **Skip rows**, and map **ID/Name/Final/Total** columns
    5. Click **Insert Marks**
    6. Review the modal report for any mismatches

    ## 🧾 Expected CSV format (example)
    ```csv
    SL,ID,Name,Section,Quiz,Midterm,Attendance,Final,Total
    1,23301234,Student A,01,20,26,5,64,115
    2,23301235,Student B,01,19,30,5,71,125
    ```
    - Map **ID** → column B, **Name** → column C, **Final** → column H, **Total** → column I (defaults).

    ## 🔒 Privacy
    - All processing happens **locally** in your browser.
    - No network requests are made except those already required by BRACU Connect.

    ## 🧰 Tech
    - Manifest V3, content scripts, minimal permissions (`scripting` + host match)
    - Assets: `content.js`, `styles.css`, icons in `/icons`

    ## 📄 Changelog
    - **2025-09-06**: Created.

    ---

    ## Original Notes
    (Automatically preserved from earlier README for reference)

    # Fill Marks from CSV — v1.0.0 (MV3)

Panel design:
- **CSV → Marks Entry by Partho Sutra Dhor**
- **Uploader**
- **Skip rows** (textbox)
- **ID** (dropdown, default **B**) & **Name** (dropdown, default **C**)
- **Final** (dropdown, default **H**) & **Total** (dropdown, default **I**)
- **Insert Marks** button

The extension still only runs on:
`https://connect.bracu.ac.bd/app/exam-controller/mark-entry/final/*`

Modal after insertion shows:
- **Absent from final list**
- **Not in sheet**
- **Not in connect** (with a Reason column)

Install via `chrome://extensions` → Developer mode → Load unpacked.
