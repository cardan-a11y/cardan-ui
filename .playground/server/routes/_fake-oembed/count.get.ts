// How often the fake oEmbed was asked for `?url=`
export default defineEventHandler((event) => ({
  count: fakeOEmbedRequests.get(String(getQuery(event).url ?? '')) ?? 0,
}));
