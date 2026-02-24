chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "notify") {
    const title = request.title || "SEO & GEO";
    const message = request.message || "Analys klar.";
    showNotification(title, message);
  }
});

function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title,
    message,
    priority: 1
  });
}