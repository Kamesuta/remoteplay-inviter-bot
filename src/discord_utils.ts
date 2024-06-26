/**
 * Sends a request to the Discord API.
 * @param endpoint - The API endpoint to send the request to.
 * @param options - The options for the request.
 * @returns - A promise that resolves to the response from the API.
 * @throws {Error} - If the API returns an error response.
 */
export async function discordRequest(
  endpoint: string,
  options: RequestInit,
): Promise<Response> {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  const res = await fetch(url, {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent':
        'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = (await res.json()) as object;
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

/**
 * Installs or updates global commands for a Discord application.
 * @param appId - The ID of the Discord application.
 * @param commands - An array of command objects to be installed or updated.
 * @returns - A promise that resolves when the installation or update is complete.
 */
export async function installGlobalCommands(
  appId: string,
  commands: Array<object>,
): Promise<void> {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await discordRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(commands),
    });
  } catch (err) {
    console.error(err);
  }
}
