import { Innertube, UniversalCache } from 'youtubei.js';

export async function GET() {
  const yt = await Innertube.create({
    cache: new UniversalCache(false)
  });

  yt.session.on('auth-pending', (data) => {
    console.log(`Auth URL: ${data.verification_url}`);
    console.log(`Code: ${data.user_code}`);
  });

  yt.session.on('auth', ({ credentials }) => {
    console.log('Add this to your Vercel env:');
    console.log('YOUTUBE_CREDENTIALS=', JSON.stringify(credentials));
  });

  await yt.session.signIn();

  return new Response('Check server logs for auth instructions');
}
