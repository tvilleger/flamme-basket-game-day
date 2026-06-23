import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/coach-dashboard"
)({
  component: CoachDashboard,
});

function CoachDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-4xl font-black">
        Dashboard Coach
      </h1>

      <p className="mt-4">
        Bienvenue Trystan 👋
      </p>
    </div>
  );
}
