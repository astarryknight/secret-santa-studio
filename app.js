const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function randomInt(max) {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    return Math.floor(Math.random() * max);
  }
  const limit = Math.floor(0x100000000 / max) * max;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % max;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(bytes);
  }
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

// One random cycle guarantees that nobody draws their own name and that
// everybody gives and receives exactly one gift.
export function drawAssignments(names) {
  if (names.length < 2) throw new Error("Add at least two people to draw names.");
  const order = names.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const assignments = new Array(names.length);
  for (let i = 0; i < order.length; i++) {
    assignments[order[i]] = names[order[(i + 1) % order.length]];
  }
  return assignments;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid link");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

// This is intentional obfuscation, not encryption: a standalone link must
// contain everything needed to reveal its own assignment.
export function encodeAssignment(giver, recipient) {
  const payload = encoder.encode(JSON.stringify({ version: 1, giver, recipient }));
  const key = randomBytes(12);
  const hidden = payload.map((byte, index) => byte ^ key[index % key.length]);
  const combined = new Uint8Array(key.length + hidden.length);
  combined.set(key);
  combined.set(hidden, key.length);
  return toBase64Url(combined);
}

export function decodeAssignment(value) {
  const bytes = fromBase64Url(value);
  if (bytes.length < 14 || bytes.length > 8192) throw new Error("Invalid link");
  const key = bytes.subarray(0, 12);
  const payload = bytes.subarray(12).map((byte, index) => byte ^ key[index % key.length]);
  const data = JSON.parse(decoder.decode(payload));
  if (data.version !== 1 || typeof data.giver !== "string" || typeof data.recipient !== "string" ||
      !data.giver.trim() || !data.recipient.trim() || data.giver.length > 200 || data.recipient.length > 200 ||
      data.giver === data.recipient) throw new Error("Invalid link");
  return data;
}

function parseNames(value) {
  return value.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
}

function createLink(giver, recipient) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("v", encodeAssignment(giver, recipient));
  return url.href;
}

async function copyText(text, button, successText = "Copied!") {
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = successText;
    window.setTimeout(() => { button.textContent = original; }, 1800);
  } catch {
    button.textContent = "Select and copy link";
    window.setTimeout(() => { button.textContent = original; }, 2200);
  }
}

function initBuilder() {
  const form = document.querySelector("#draw-form");
  const input = document.querySelector("#names");
  const count = document.querySelector("#name-count");
  const error = document.querySelector("#form-error");
  const results = document.querySelector("#results");
  const list = document.querySelector("#link-list");
  const copyAll = document.querySelector("#copy-all");
  let latestLinks = [];

  input.addEventListener("input", () => {
    const total = parseNames(input.value).length;
    count.textContent = `${total} ${total === 1 ? "person" : "people"}`;
    error.hidden = true;
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const names = parseNames(input.value);
    const normalized = names.map(name => name.toLocaleLowerCase());
    if (names.length < 2) {
      error.textContent = "Add at least two names to make a draw.";
      error.hidden = false;
      input.focus();
      return;
    }
    if (new Set(normalized).size !== names.length) {
      error.textContent = "Each person needs a unique name. Add an initial to tell matching names apart.";
      error.hidden = false;
      input.focus();
      return;
    }
    if (names.some(name => name.length > 200)) {
      error.textContent = "Please keep each name under 200 characters.";
      error.hidden = false;
      input.focus();
      return;
    }

    const assignments = drawAssignments(names);
    latestLinks = names.map((name, index) => ({ name, link: createLink(name, assignments[index]) }));
    list.replaceChildren();
    latestLinks.forEach(({ name, link }, index) => {
      const row = document.createElement("div");
      row.className = "link-row";
      const number = document.createElement("span");
      number.className = "link-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const details = document.createElement("div");
      details.className = "link-details";
      const heading = document.createElement("strong");
      heading.textContent = name;
      const field = document.createElement("input");
      field.type = "text";
      field.readOnly = true;
      field.value = link;
      field.setAttribute("aria-label", `Reveal link for ${name}`);
      field.addEventListener("focus", () => field.select());
      details.append(heading, field);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.textContent = "Copy link";
      button.setAttribute("aria-label", `Copy link for ${name}`);
      button.addEventListener("click", () => copyText(link, button));
      row.append(number, details, button);
      list.append(row);
    });
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  copyAll.addEventListener("click", () => {
    const text = latestLinks.map(({ name, link }) => `${name}: ${link}`).join("\n");
    copyText(text, copyAll);
  });
}

function initReveal(value) {
  let assignment;
  try {
    assignment = decodeAssignment(value);
  } catch {
    document.querySelector("#invalid-view").hidden = false;
    return;
  }
  document.querySelector("#reveal-view").hidden = false;
  document.querySelector("#reveal-intro").textContent = `${assignment.giver}, your holiday mission is ready. Open the envelope to find out who you're shopping for.`;
  const button = document.querySelector("#reveal-button");
  button.addEventListener("click", () => {
    document.querySelector("#recipient-name").textContent = assignment.recipient;
    document.querySelector("#assignment").hidden = false;
    button.hidden = true;
    document.querySelector("#assignment").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

const params = new URLSearchParams(window.location.search);
if (params.has("v")) {
  initReveal(params.get("v"));
} else {
  document.querySelector("#builder-view").hidden = false;
  initBuilder();
}
