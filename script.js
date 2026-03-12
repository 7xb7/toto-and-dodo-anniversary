document.addEventListener("DOMContentLoaded", () => {
  // Page boot starts here.
  // Wait a tiny bit so the first paint is done before animations start.
  setTimeout(() => {
    // Randomize leaf delays so they are spread out when we unhide them.
    const leaves = document.querySelectorAll(".falling-pixel-leaf");
    leaves.forEach((leaf) => {
      // Pick a random offset up to ~18s (longest leaf animation duration)
      const randomDelay = -Math.random() * 18;
      leaf.style.animationDelay = `${randomDelay}s`;

      // Keep leaves mostly inside the viewport so they don't appear to "bounce" off edges.
      const maxSpread = Math.min(240, window.innerWidth * 0.25);
      leaf.style.setProperty("--leaf-mid-x", `${(Math.random() - 0.5) * maxSpread * 2}px`);
      leaf.style.setProperty("--leaf-end-x", `${(Math.random() - 0.5) * maxSpread * 2}px`);

      // Smaller leaves on phones.
      const minLeafSize = 20;
      const maxLeafSize = window.innerWidth < 900 ? 40 : 160;
      const leafSize = minLeafSize + Math.random() * (maxLeafSize - minLeafSize);
      leaf.style.setProperty("--leaf-size", `${leafSize}px`);
    });

    document.body.classList.remove("not-loaded");

    // Reveal leaves after the initial paint (prevents them from showing half-fallen on first render)
    const leafLayer = document.querySelector(".falling-pixel-leaves");
    if (leafLayer) {
      leafLayer.style.opacity = "";
      leafLayer.style.visibility = "";
    }
  }, 100);

  // Main first-page elements we update while the timer is running.
  const countdownValueEl = document.getElementById("anniversary-countdown-value");
  const daysValueEl = document.getElementById("anniversary-days-value");
  const hoursValueEl = document.getElementById("anniversary-hours-value");
  const minutesValueEl = document.getElementById("anniversary-minutes-value");
  const secondsValueEl = document.getElementById("anniversary-seconds-value");
  const openStoryLinkEl = document.getElementById("anniversary-open-story-link");
  const notYetToastEl = document.getElementById("anniversary-not-yet-toast");
  const lockedStoryLabel =
    openStoryLinkEl?.textContent?.trim() || "Click When The Timer Is Up";
  // Fallback button text if HTML text is missing.

  // Timer helpers + state.
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  let interval = null;
  let toastTimeout = null;
  let isCountdownComplete = false;
  let bypassClickCount = 0;
  const BYPASS_CLICK_THRESHOLD = 68; // Easter egg click count.

  // Small obfuscation so the target page path is not plain text in source.
  function getStoryPath() {
    return String.fromCharCode(
      115, 101, 99, 111, 110, 100, 95, 112, 97, 103, 101, 46, 104, 116, 109, 108
    );
  }

  function pad(value) {
    // Show values like 08 instead of 8.
    return String(value).padStart(2, "0");
  }

  function getNextAnniversaryTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    // Uses device time on purpose:
    // target is always April 22 of this device year.
    // If device date is already past it, timer stays at 0.
    return new Date(year, 3, 22, 0, 0, 0, 0).getTime();
  }

  const targetTimestamp = getNextAnniversaryTimestamp();
  // This value stays fixed for this page load.

  // Quick "not yet" message when the page is still locked.
  function showNotYetToast() {
    if (!notYetToastEl) return;
    notYetToastEl.classList.add("visible");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      notYetToastEl.classList.remove("visible");
      toastTimeout = null;
    }, 1000);
  }

  function updateStoryLinkState() {
    // Keep button visuals and accessibility attributes in sync.
    if (!openStoryLinkEl) return;
    if (isCountdownComplete) {
      openStoryLinkEl.classList.add("ready");
      openStoryLinkEl.textContent = "Happy Anniversary! Click Me <3";
      openStoryLinkEl.setAttribute("aria-disabled", "false");
      openStoryLinkEl.removeAttribute("tabindex");
      return;
    }
    openStoryLinkEl.classList.remove("ready");
    openStoryLinkEl.textContent = lockedStoryLabel;
    openStoryLinkEl.setAttribute("aria-disabled", "true");
    openStoryLinkEl.setAttribute("tabindex", "0");
  }

  // Update full timer text + the flower numbers.
  function updateCountdown() {
    // Get remaining time from now to target date.
    const now = Date.now();
    let diff = Math.max(targetTimestamp - now, 0);
    const days = Math.floor(diff / MS_PER_DAY);
    diff -= days * MS_PER_DAY;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    diff -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diff / (60 * 1000));
    diff -= minutes * 60 * 1000;
    const seconds = Math.floor(diff / 1000);

    if (countdownValueEl) countdownValueEl.textContent = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    // Also update the flower counters.
    if (daysValueEl) daysValueEl.textContent = String(days);
    if (hoursValueEl) hoursValueEl.textContent = pad(hours);
    if (minutesValueEl) minutesValueEl.textContent = pad(minutes);
    if (secondsValueEl) secondsValueEl.textContent = pad(seconds);

    const wasComplete = isCountdownComplete;
    isCountdownComplete = (targetTimestamp - Date.now()) <= 0;
    // Refresh button only when state changes.
    if (isCountdownComplete !== wasComplete) updateStoryLinkState();

    if (isCountdownComplete && interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  // Easter egg: enough clicks unlocks the story even before timer ends.
  function tryOpenStoryBypass() {
    if (isCountdownComplete) {
      window.location.assign(getStoryPath());
      return;
    }
    bypassClickCount += 1;
    // Unlock once the hidden click threshold is reached.
    if (bypassClickCount >= BYPASS_CLICK_THRESHOLD) {
      window.location.assign(getStoryPath());
      return;
    }
    showNotYetToast();
  }

  if (openStoryLinkEl) {
    // Mouse click support.
    openStoryLinkEl.addEventListener("click", (event) => {
      event.preventDefault();
      tryOpenStoryBypass();
    });
    // Keyboard support (Enter / Space).
    openStoryLinkEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      tryOpenStoryBypass();
    });
  }

  // First paint for timer + button state.
  updateCountdown();
  updateStoryLinkState();

  // Start the interval on the next exact second so ticks look clean.
  const msToNextSec = 1000 - (Date.now() % 1000);
  setTimeout(() => {
    // Sync once more before the interval starts.
    updateCountdown();
    if (!isCountdownComplete) interval = setInterval(updateCountdown, 1000);
  }, msToNextSec);
});