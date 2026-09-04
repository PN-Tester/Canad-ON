const box = document.getElementById("box");
const toggle = document.getElementById("toggle");
const label = document.getElementById("label");

function render(isOn) {
  label.textContent = isOn ? "Canad/ON" : "Canad/OFF";
  box.classList.toggle("on", isOn);
}

// Load saved state on popup open
chrome.storage.local.get(["canadOn"], (result) => {
  const isOn = !!result.canadOn;
  toggle.checked = isOn;
  render(isOn);
});

toggle.addEventListener("change", () => {
  const isOn = toggle.checked;
  render(isOn);
  chrome.storage.local.set({ canadOn: isOn });
  chrome.runtime.sendMessage({ type: "CANAD_TOGGLE", value: isOn });
});
