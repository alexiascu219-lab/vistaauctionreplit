# Vista Auction Careers Website

This is a React website built with Vite and TailwindCSS, designed to replicate the style of the Vista Auction careers page.

## 🚀 How to Run the Website

Follow these steps to start the application on your computer:

1.  **Open Terminal**: Open your command prompt or terminal (PowerShell, CMD, or VS Code terminal).
2.  **Navigate to Project**: Make sure you are inside the `vistaauctionreplit` folder.
    ```bash
    cd c:\Users\Alex\OneDrive\Desktop\vistaauctionreplit
    ```
3.  **Start Development Server**: Run the following command:
    ```bash
    npm run dev
    ```
4.  **Open in Browser**:
    - Look for the URL in the terminal output (usually `http://localhost:5173`).
    - Ctrl+Click the link or copy-paste it into your web browser.

## 🛠 Project Structure

If you want to edit the content:

-   **`src/App.jsx`**: The main page layout. You can change the "Current Openings" text here.
-   **`src/components/Navbar.jsx`**: Top navigation bar code.
-   **`src/components/Hero.jsx`**: The large top section with the background and title.
-   **`src/components/FeatureCard.jsx`**: The design for the 3 key feature cards.
-   **`tailwind.config.js`**: Contains the colors (`primary`: Orange, `text-main`: Navy) and fonts.

## 📦 Building for Production

To create a final version for deployment:

```bash
npm run build
```

This will create a `dist` folder with the optimized files.
