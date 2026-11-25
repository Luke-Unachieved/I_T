import { decisionInfo } from '../engine/expansion.js';
import { pageCoach, quoteCoach, quoteRecommendation, eventCoach } from './coaching.js';
import { quotePreviewNumbers } from './trade.js';

// Keep a single immutable game snapshot per generation. All existing WeakMap
// planner caches are reused across pages and quote edits within that generation.
let snapshot;
let generation;

self.addEventListener('message', ({ data: message }) => {
  const { id, revision, kind, payload } = message;
  try {
    if (message.state !== undefined) {
      snapshot = message.state;
      generation = revision;
    }
    if (!snapshot || generation !== revision) throw new Error('Planning snapshot expired');
    let result;
    if (kind === 'page') {
      result = { html: pageCoach(snapshot, payload.ui) };
    } else if (kind === 'quote') {
      const inquiry = snapshot.inquiries.find(item => item.id === payload.inquiryId);
      if (!inquiry) throw new Error('Inquiry is no longer available');
      const { model, initial, filter } = payload;
      const recommendation = quoteRecommendation(snapshot, inquiry, filter);
      result = {
        html: quoteCoach(snapshot, inquiry, model, filter, initial),
        numbersHtml: quotePreviewNumbers(snapshot, inquiry, model),
        recommendation: recommendation ? { config: recommendation.config } : null,
      };
      if (recommendation) {
        const adoptedModel = { ...model, ...recommendation.config };
        // The receipt and figures for the exact offered configuration are ready
        // before the player taps Adopt, so that gesture never launches planning.
        result.adopted = {
          model: adoptedModel,
          html: quoteCoach(snapshot, inquiry, adoptedModel, filter, initial),
          numbersHtml: quotePreviewNumbers(snapshot, inquiry, adoptedModel),
          recommendation: result.recommendation,
        };
      }
    } else if (kind === 'event') {
      const event = snapshot.events.find(item => item.id === payload.eventId);
      if (!event) throw new Error('Decision is no longer available');
      result = { recommendation: eventCoach(snapshot, event, decisionInfo(snapshot, event).choices) };
    } else throw new Error('Unknown planning request');
    self.postMessage({ id, revision, result });
  } catch (error) {
    self.postMessage({ id, revision, error: String(error?.message ?? error) });
  }
});
