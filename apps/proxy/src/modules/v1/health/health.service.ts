export default class HealthService {
  getStatus() {
    return { status: "ok" as const, timestamp: new Date().toISOString() };
  }
}
