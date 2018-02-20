'use strict';

const Gatherer = require('lighthouse').Gatherer;

class FirstCallResponse extends Gatherer {
    afterPass(options) {
        const driver = options.driver;

        return driver.evaluateAsync('window.firstCallTime')
            .then(firstCallTime => {
                if (!firstCallTime) {

                    throw new Error('Unable to find card load metrics in page');
                }
                return firstCallTime;
            });
    }
}

module.exports = FirstCallResponse;
