export default class HealthService {
  getStatus() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      runtime: process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`,
    };
  }
}
