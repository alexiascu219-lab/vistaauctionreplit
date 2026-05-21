/**
 * Vista Auction - Security & Anti-Theft Protocol
 * Prevents casual code theft and inspection.
 */

export const enableSecurityLockdown = () => {
    if (import.meta.env.DEV) return; // Allow dev tools in development

    // 1. Disable Right Click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // 2. Disable Keyboard Shortcuts for DevTools / View Source
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+U (View Source)
        if (e.ctrlKey && (e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j') || e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
            return false;
        }
    });

    console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0px black;");
    console.log("%cThis is a protected browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or 'hack' someone's account, it is a scam and will give them access to your Vista Auction account.", "font-size: 18px;");
};
