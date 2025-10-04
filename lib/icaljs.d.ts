declare module 'ical.js' {
  const ICAL: {
    Component: {
      fromJSON(data: unknown): { toString(): string };
    };
  };
  export default ICAL;
}
