declare module 'ical.js' {
  type JCalProperty = [string, Record<string, string>, string, string];
  type JCalComponent = [string, JCalProperty[], JCalComponent[]];
  type JCalData = [string, JCalProperty[], JCalComponent[]];

  class Component {
    constructor(jcal: JCalData);
    toString(): string;
  }

  const ICAL: {
    Component: typeof Component;
  };

  export default ICAL;
}
