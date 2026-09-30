const mongoose = require('mongoose');

/**
 * Calculates the system-enforced zone for a land parcel based on PRD Section 8 & 23.
 *
 * @param {Object} parcel - The parcel document or plain object
 * @param {Array} openIssues - Array of unresolved issues for this parcel
 * @returns {Object} { zone: 'GREEN'|'YELLOW'|'ORANGE'|'RED', reason: String, workflowStatus: String }
 */
const calculateZone = (parcel, openIssues = []) => {
  const stage = parcel.stage;
  const paymentStatus = parcel.payment?.status;
  const compStatus = parcel.compensationOffer?.status;
  const bankStatus = parcel.bankDetails?.status;

  // 1. GREEN: Completed and payment successful
  if (stage === 'COMPLETED' && paymentStatus === 'SUCCESS') {
    return {
      zone: 'GREEN',
      reason: 'Acquisition workflow successfully finalized. Full compensation disbursed.',
      workflowStatus: 'Completed',
    };
  }

  // 2. RED: Parcel detail dispute, ownership dispute, or critical dispute open
  const redIssues = openIssues.filter(
    (issue) =>
      issue.status !== 'RESOLVED' &&
      ['PARCEL_DISPUTE', 'OWNERSHIP_DISPUTE', 'CRITICAL_DISPUTE'].includes(
        issue.type
      )
  );

  if (redIssues.length > 0 || stage === 'DISPUTED') {
    const primaryReason =
      redIssues.length > 0
        ? `Critical Dispute: ${redIssues[0].category} - ${redIssues[0].description}`
        : 'Parcel details or title ownership formally disputed';

    return {
      zone: 'RED',
      reason: primaryReason,
      workflowStatus: 'Critical / Disputed',
    };
  }

  // 3. ORANGE: Attention required (Doc rejection, compensation objection, bank failed, payment failed)
  const orangeIssues = openIssues.filter(
    (issue) =>
      issue.status !== 'RESOLVED' &&
      [
        'DOCUMENT_REJECTION',
        'COMPENSATION_OBJECTION',
        'BANK_FAILURE',
        'PAYMENT_FAILURE',
      ].includes(issue.type)
  );

  const isCompObjected =
    stage === 'COMPENSATION_OBJECTION' || compStatus === 'OBJECTED';
  const isBankFailed =
    bankStatus === 'REJECTED' || bankStatus === 'CORRECTION_REQUIRED';
  const isPaymentFailed = paymentStatus === 'FAILED';

  if (
    orangeIssues.length > 0 ||
    isCompObjected ||
    isBankFailed ||
    isPaymentFailed
  ) {
    let reason = 'Action required to resolve bottleneck';

    if (orangeIssues.length > 0) {
      reason = `${orangeIssues[0].category}: ${orangeIssues[0].description}`;
    } else if (isCompObjected) {
      reason = `Compensation objection raised: ${
        parcel.compensationOffer?.objectionReason || 'Review requested by landowner'
      }`;
    } else if (isBankFailed) {
      reason = `Bank details verification failed: ${
        parcel.bankDetails?.rejectionReason || 'Correction required'
      }`;
    } else if (isPaymentFailed) {
      reason = `Simulated payment failed: ${
        parcel.payment?.failureReason || 'Treasury gateway rejected transaction'
      }`;
    }

    return {
      zone: 'ORANGE',
      reason: reason,
      workflowStatus: 'Attention Required',
    };
  }

  // 4. YELLOW: In Progress / Normal action pending
  let stageDescription = 'Workflow in progress';
  switch (stage) {
    case 'INVITED':
      stageDescription = 'Awaiting landowner login and onboarding';
      break;
    case 'PARCEL_DETAILS_REVIEW':
      stageDescription = 'Landowner reviewing parcel boundaries & survey numbers';
      break;
    case 'DOCUMENT_UPLOAD':
      stageDescription = 'Awaiting title deed & identity document upload';
      break;
    case 'DOCUMENT_VERIFICATION':
      stageDescription = 'Documents uploaded. Officer verification in progress';
      break;
    case 'COMPENSATION_REVIEW':
      stageDescription = 'Compensation offer generated. Awaiting landowner decision';
      break;
    case 'BANK_DETAILS':
      stageDescription = 'Compensation accepted. Awaiting bank account details';
      break;
    case 'BANK_VERIFICATION':
      stageDescription = 'Bank details submitted. SLAO verification in progress';
      break;
    case 'PAYMENT_PROCESSING':
      stageDescription = 'Simulated treasury payment disbursement processing';
      break;
    case 'ISSUE_REVIEW':
      stageDescription = 'Officer reviewing raised inquiry';
      break;
    default:
      stageDescription = 'Case in active processing pipeline';
  }

  return {
    zone: 'YELLOW',
    reason: stageDescription,
    workflowStatus: 'In Progress / Action Pending',
  };
};

/**
 * Recalculates and updates the zone on a parcel in MongoDB.
 *
 * @param {String|ObjectId} parcelId
 * @returns {Promise<Object>} Updated parcel
 */
const recalculateParcelZone = async (parcelId) => {
  const Parcel = mongoose.model('Parcel');
  const Issue = mongoose.model('Issue');

  const parcel = await Parcel.findById(parcelId);
  if (!parcel) return null;

  const openIssues = await Issue.find({
    parcelId: parcel._id,
    status: { $ne: 'RESOLVED' },
  });

  const { zone, reason, workflowStatus } = calculateZone(parcel, openIssues);

  parcel.zone = zone;
  parcel.zoneReason = reason;
  parcel.workflowStatus = workflowStatus;

  await parcel.save();
  return parcel;
};

module.exports = {
  calculateZone,
  recalculateParcelZone,
};
