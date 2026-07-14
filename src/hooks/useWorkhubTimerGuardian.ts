import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkhubTimerStore } from '../stores/workhubTimerStore';
import { timerService } from '../services/workhubApi';

// §16 ArbZG: auto-pause at 6h continuous work, warn starting 30 min before
export const ARBZG_LIMIT_SECONDS = 6 * 3600;
export const ARBZG_WARN_MINUTES = 360;

// Worker forgot to stop the timer / resume from break: nudge every 30 min, up to 10 times,
// then take the agreed fallback action automatically.
export const REMINDER_INTERVAL_SECONDS = 30 * 60;
export const MAX_REMINDERS = 10;
export const BREAK_FORGOTTEN_THRESHOLD_SECONDS = 60 * 60; // 60 min

/**
 * Runs the WorkHub timer's background rules exactly once regardless of which timer UI
 * (TimerWidget, TimerPip, neither) happens to be mounted — mount this at the WorkHub layout
 * root so reminders/auto-actions keep firing no matter which tab the worker is looking at.
 */
export function useWorkhubTimerGuardian() {
    const qc = useQueryClient();

    const arbzgAutoPausedRef = useRef(false);
    const arbzgWarnedRef = useRef(false);
    const targetReminderCountRef = useRef(0);
    const targetAutoStoppedRef = useRef(false);
    const breakReminderCountRef = useRef(0);
    const breakAutoResumedRef = useRef(false);

    useEffect(() => {
        const tick = () => {
            const timer = useWorkhubTimerStore.getState();
            if (timer.state === 'idle') return;

            const elapsed = timer.getElapsedSeconds();
            const breakElapsed = timer.getBreakSeconds();

            // --- §16 ArbZG: auto-pause at 6h, warn 30 min before ---
            if (timer.state === 'running') {
                const workedMinutes = Math.floor(elapsed / 60);

                if (elapsed >= ARBZG_LIMIT_SECONDS && !arbzgAutoPausedRef.current) {
                    arbzgAutoPausedRef.current = true;
                    const taskId = timer.activeTaskId;
                    if (taskId) {
                        timerService.pause(taskId).catch(() => { /* still pause locally to enforce the law */ });
                    }
                    timer.pause();
                    qc.invalidateQueries({ queryKey: ['wh-tasks'] });
                    toast.error('Break required by law (§16 ArbZG). Timer paused automatically.');
                } else if (
                    workedMinutes >= ARBZG_WARN_MINUTES - 30 &&
                    workedMinutes < ARBZG_WARN_MINUTES &&
                    !arbzgWarnedRef.current
                ) {
                    arbzgWarnedRef.current = true;
                    toast.warning(`§16 ArbZG: Break required in ${ARBZG_WARN_MINUTES - workedMinutes} min.`);
                }

                if (elapsed < ARBZG_LIMIT_SECONDS) arbzgAutoPausedRef.current = false;
                if (workedMinutes < ARBZG_WARN_MINUTES - 30) arbzgWarnedRef.current = false;
            }

            // --- Forgot to stop the timer: nudge once the task's target/estimated time is
            // reached, every 30 min, up to 10 times, then auto-stop and cap logged time at
            // exactly the target (never log beyond it). Only applies when the task has an
            // estimate — no target means nothing to guard against.
            if (timer.state === 'running' && timer.activeTaskEstHours != null) {
                const targetSeconds = Math.max(
                    0,
                    (timer.activeTaskEstHours - timer.activeTaskLoggedBaselineHours) * 3600
                );
                const overrun = elapsed - targetSeconds;

                if (overrun >= 0) {
                    const reminderN = Math.min(MAX_REMINDERS, Math.floor(overrun / REMINDER_INTERVAL_SECONDS) + 1);

                    if (reminderN > targetReminderCountRef.current) {
                        targetReminderCountRef.current = reminderN;
                        toast.warning(
                            `"${timer.activeTaskTitle}" has reached its target time of ${timer.activeTaskEstHours}h — please stop the timer. (Reminder ${reminderN}/${MAX_REMINDERS})`,
                            { duration: 10000 }
                        );
                    }

                    if (reminderN >= MAX_REMINDERS && !targetAutoStoppedRef.current) {
                        targetAutoStoppedRef.current = true;
                        const taskId = timer.activeTaskId;
                        const capSeconds = Math.round(targetSeconds);
                        if (taskId) {
                            timerService.stop(taskId, capSeconds)
                                .catch(() => { /* still stop locally so the UI doesn't stay stuck */ })
                                .finally(() => {
                                    timer.stop();
                                    qc.invalidateQueries({ queryKey: ['wh-tasks'] });
                                    qc.invalidateQueries({ queryKey: ['wh-task', taskId] });
                                });
                        }
                        toast.error(
                            `No response after ${MAX_REMINDERS} reminders — timer auto-stopped. Logged time capped at the target of ${timer.activeTaskEstHours}h.`
                        );
                    }
                } else {
                    targetReminderCountRef.current = 0;
                    targetAutoStoppedRef.current = false;
                }
            }

            // --- Forgot to resume from break: nudge once the break exceeds 60 min, every
            // 30 min, up to 10 times, then auto-resume so break-time accounting stays correct.
            if (timer.state === 'break') {
                const overrun = breakElapsed - BREAK_FORGOTTEN_THRESHOLD_SECONDS;

                if (overrun >= 0) {
                    const reminderN = Math.min(MAX_REMINDERS, Math.floor(overrun / REMINDER_INTERVAL_SECONDS) + 1);

                    if (reminderN > breakReminderCountRef.current) {
                        breakReminderCountRef.current = reminderN;
                        toast.warning(
                            `Still on break for "${timer.activeTaskTitle}"? Break has run over 60 min — resume when ready. (Reminder ${reminderN}/${MAX_REMINDERS})`,
                            { duration: 10000 }
                        );
                    }

                    if (reminderN >= MAX_REMINDERS && !breakAutoResumedRef.current) {
                        breakAutoResumedRef.current = true;
                        const taskId = timer.activeTaskId;
                        if (taskId) {
                            timerService.start(taskId)
                                .catch(() => { /* still resume locally so the UI doesn't stay stuck */ })
                                .finally(() => {
                                    timer.resume();
                                    qc.invalidateQueries({ queryKey: ['wh-tasks'] });
                                });
                        }
                        toast.error(`No response after ${MAX_REMINDERS} reminders — break ended automatically, timer resumed.`);
                    }
                } else {
                    breakReminderCountRef.current = 0;
                    breakAutoResumedRef.current = false;
                }
            } else {
                breakReminderCountRef.current = 0;
                breakAutoResumedRef.current = false;
            }
        };

        const id = setInterval(tick, 1000);
        tick();
        return () => clearInterval(id);
    }, [qc]);
}
