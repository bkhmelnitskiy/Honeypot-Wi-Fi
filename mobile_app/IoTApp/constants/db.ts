import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("myapp.db");

export function initDB() {
    db.execSync(`
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_scan_id TEXT,
            client_scan_id TEXT,
            network TEXT,
            safety_score INTEGER,
            scan_duration_sec INTEGER,
            attacks TEXT,
            device_hardware_id TEXT,
            firmware_version TEXT,
            started_at TEXT,
            completed_at TEXT
        );      
    `);
}

export function getItems() {
    return db.getAllSync<{ id: number, server_scan_id: string, client_scan_id: string, network: string, safety_score: number, scan_duration_sec: number, attacks: string, device_hardware_id: string, firmare_version: string, started_at: string, completed_at: string }>(
        "SELECT * FROM scans"
    );
}

export function addItem(name: string) {
    return db.runSync('INSERT INTO scans (network) VALUES (?)', [name]);
}

export function deleteItem(id: number) {
    return db.runSync('DELETE FROM scans WHERE id = ?', [id]);
}

export function getItemById(id: number) {
    return db.getFirstSync<{ id: number, server_scan_id: string, client_scan_id: string, network: string, safety_score: number, scan_duration_sec: number, attacks: string, device_hardware_id: string, firmare_version: string, started_at: string, completed_at: string }>(
        'SELECT * FROM scans WHERE id = ?', [id]
    );
}

export default db;