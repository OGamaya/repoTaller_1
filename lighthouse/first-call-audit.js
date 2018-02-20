'use strict';

const Audit = require('lighthouse').Audit;

const MAX_RESPONSE_TIME = 3000;

class FirstCallAudit extends Audit {
    static get meta() {
        return {
            category: 'MyPerformance',
            name: 'first-call-audit',
            description: 'The API response first call',
            failureDescription: 'The API response is to slow',
            helpText: 'Used to measure time from API is called and this reponse',
            requiredArtifacts: ['FirstCallResponse']
        };
    }

    static audit(artifacts) {
        const responseTime = artifacts.FirstCallResponse;

        const belowThreshold = responseTime <= MAX_RESPONSE_TIME;

        return {
            rawValue: responseTime,
            score: belowThreshold
        };
    }
}

module.exports = FirstCallAudit;
