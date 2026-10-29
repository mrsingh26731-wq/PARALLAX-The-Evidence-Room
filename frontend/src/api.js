let csrf = "";
export async function api(path, method = "GET", body) {
  const r = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrf
        ? {
            "X-CSRF-Token": csrf,
          }
        : {}),
    },
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
        }
      : {}),
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error(
      "API unavailable. Start the backend and configure the database.",
    );
  }
  if (!r.ok)
    throw Object.assign(Error(d.error || "Request failed"), {
      status: r.status,
    });
  if (d.csrf) csrf = d.csrf;
  return d;
}
export async function demo() {
  try {
    return await api("/demo");
  } catch {
    return fetch("/demo.json").then((r) => r.json());
  }
}
