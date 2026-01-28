/**
 * BackupManager.js
 * Utility to help users rescue their local data before cache clearing.
 */

export const exportLocalData = () => {
    try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vista_storage_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Storage: Local backup completed.');
    } catch (e) {
        console.error('Backup failed:', e);
        alert('Backup failed. Check console for details.');
    }
};
