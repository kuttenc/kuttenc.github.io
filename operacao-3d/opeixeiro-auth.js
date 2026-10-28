(() => {
  async function invoke(client, body) {
    const { data, error } = await client.functions.invoke("opeixeiro-auth", { body });
    if (!error) return data;
    let message = "Não foi possível concluir a solicitação.";
    try {
      const context = error.context?.clone ? error.context.clone() : error.context;
      const detail = context ? await context.json() : null;
      if (detail?.error) message = detail.error;
    } catch (_) {
      if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
        message = error.message;
      }
    }
    throw new Error(message);
  }

  async function listProfiles(client, kind) {
    const data = await invoke(client, { action: "list_profiles", kind });
    if (!Array.isArray(data?.profiles)) {
      throw new Error("Resposta inválida ao carregar perfis.");
    }
    return data.profiles;
  }

  async function signIn(client, kind, displayName, password) {
    const data = await invoke(client, {
      action: "login",
      kind,
      display_name: displayName,
      password,
    });
    if (!data?.session?.access_token || !data?.session?.refresh_token) {
      throw new Error(data?.error || "A autenticação não retornou uma sessão.");
    }

    const { error: sessionError } = await client.auth.setSession(data.session);
    if (sessionError) throw sessionError;
    return data.actor;
  }

  window.OpeixeiroAuth = Object.freeze({ listProfiles, signIn });
})();
