export async function requestPermission() {
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function scheduleReminder(judul: string, tanggal: Date, menitSebelum = 30) {
  const delay = tanggal.getTime() - Date.now() - menitSebelum * 60_000;
  if (delay <= 0) return;
  setTimeout(() => {
    new Notification(`🔔 Pengingat: ${judul}`, {
      body: `Dimulai ${menitSebelum} menit lagi`,
      icon: "/vite.svg", // Using vite.svg as default since logo.png might not exist
    });
  }, delay);
}
