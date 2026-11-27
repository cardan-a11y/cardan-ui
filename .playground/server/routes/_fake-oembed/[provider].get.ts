// YouTube's and Vimeo's oEmbed for the browser suite (test/browser/serve.mjs):
// a title from the page URL; an id with `slow` answers after 6 s, `fails` with 500
export default defineEventHandler(async (event) => {
  const page = String(getQuery(event).url ?? '');
  fakeOEmbedRequests.set(page, (fakeOEmbedRequests.get(page) ?? 0) + 1);

  if (page.includes('slow')) {
    await new Promise((resolve) => setTimeout(resolve, 6000));
  }
  if (page.includes('fails')) {
    throw createError({ statusCode: 500 });
  }

  return {
    title: `Fake ${getRouterParam(event, 'provider')}: ${page}`,
    width: 1280,
    height: 720,
  };
});
