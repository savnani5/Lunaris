import { Innertube, UniversalCache } from 'youtubei.js';

export async function GET() {
  const yt = await Innertube.create({
    cache: new UniversalCache(false)
  });

  let authData: { verification_url?: string; user_code?: string } = {};
  let credentialsReceived = false;

  yt.session.on('auth-pending', (data) => {
    console.log(`Auth URL: ${data.verification_url}`);
    console.log(`Code: ${data.user_code}`);
    authData = data;
  });

  yt.session.on('auth', ({ credentials }) => {
    console.log('YOUTUBE_CREDENTIALS=', JSON.stringify(credentials));
    credentialsReceived = true;
  });

  try {
    await Promise.race([
      yt.session.signIn(),
      new Promise((_, reject) => setTimeout(() => reject('Timeout'), 30000))
    ]);

    if (credentialsReceived) {
      return Response.json({ message: 'Authentication successful, check logs for credentials' });
    }
  } catch (error) {
    if (authData.verification_url) {
      return Response.json({
        message: 'Please complete authentication',
        auth_url: authData.verification_url,
        code: authData.user_code
      });
    }
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
