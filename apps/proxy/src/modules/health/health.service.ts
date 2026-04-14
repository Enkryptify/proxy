export default class HealthService {
  getStatus() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
