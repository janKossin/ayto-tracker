import { Button } from "@/components/ui/button";
import { ApiClient } from "@/lib/api-client";
import {
  isFileNewerThanLast,
  saveLastImportedJsonFile,
} from "@/utils/jsonVersion";
import { useState } from "react";
import { CircularProgress, Alert, Snackbar } from "@mui/material";
import { ParticipantService } from "@/services/participantService";

export function ImportExport() {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  async function doExport() {
    try {
      setLoading(true);
      // For export, we might need a backend endpoint that returns the full DB dump or we assemble it here.
      // Currently, ParticipantService.getAllParticipants() only gets participants.
      // Ideally, backend should have GET /export.
      // If not, we might stick with just Participants export or warn user.
      // BUT, the user's file is a full export.
      // Let's assume for now we only support Import of full data, and Export of Participants (legacy behavior)
      // OR we fetch all endpoints.

      const all = await ParticipantService.getAllParticipants();

      // We could try to fetch others too if we want a full export
      // But let's stick to base functionality for now or check if backend has /export?
      // Backend routes seemed to have /import, maybe /export is missing.

      // Let's construct a compatible export object if possible
      const exportData = {
        participants: all,
        // matchboxes: await MatchboxService.getAll(), // if imported
        // ...
        exportedAt: new Date().toISOString(),
        version: "0.0.1",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ayto-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      setSnackbar({
        open: true,
        message: "Fehler beim Exportieren",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();

      // Version check
      const check = isFileNewerThanLast(file.name);
      if (check.isNewer === false) {
        const proceed = confirm(
          `Die ausgewählte Datei scheint nicht neuer zu sein als die zuletzt verwendete.\n\n` +
            `Zuletzt importiert: ${check.lastFileName ?? "unbekannt"}\n` +
            `Aktuelle Datei: ${file.name}\n\n` +
            `Trotzdem importieren?`,
        );
        if (!proceed) return;
      }

      let data = JSON.parse(text);

      // Support legacy format { participants: [...] } vs full root object
      let importPayload: any = {};

      if (Array.isArray(data)) {
        // Legacy: Array of participants
        importPayload = { participants: data };
      } else if (data.participants && Array.isArray(data.participants)) {
        // Full export object
        importPayload = data;
      } else {
        // Unknown format, assume it might be a single object or fail
        console.warn("Unknown JSON structure", data);
        // Try to send as is if it matches schema
        importPayload = data;
      }

      // Ask for Clear
      const clear = confirm(
        "Möchten Sie die Datenbank vor dem Import leeren?\n(Empfohlen für sauberen Import)",
      );
      if (clear) {
        importPayload.clearBeforeImport = true;
      }

      console.log("Sending import payload:", importPayload);

      const result = await ApiClient.post("/import", importPayload);

      saveLastImportedJsonFile(file.name);

      let msg = "Import erfolgreich!";
      if (result.stats) {
        const s = result.stats;
        msg += ` (${s.participants} Teilnehmer, ${s.matchingNights} MNs, ${s.matchboxes} Boxen)`;
      }

      setSnackbar({
        open: true,
        message: msg,
        severity: "success",
      });

      setTimeout(() => location.reload(), 1500);
    } catch (error: any) {
      console.error("Fehler beim Import:", error);
      setSnackbar({
        open: true,
        message: `Import fehlgeschlagen: ${error.message || "Unbekannter Fehler"}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <Button onClick={doExport} variant="outline" disabled={loading}>
        {loading ? <CircularProgress size={16} className="mr-2" /> : null}
        Export JSON
      </Button>
      <label
        className={`inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 h-10 ${loading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <span>Import JSON</span>
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={doImport}
          disabled={loading}
        />
      </label>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
}
