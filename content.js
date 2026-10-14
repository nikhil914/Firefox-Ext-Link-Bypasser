// Link Bypasser for Firefox (desktop + Android).
// Everything runs only while the extension is switched on in its popup (default: on).
function runBypasser() {
    // =====================================================================
    // LinkShortX flow: linkshortx.in -> hindisink.com "Step 1..N of N" pages
    // -> linkshortx.in "Get Link" page -> telegram.me (final destination).
    // =====================================================================
    (function linkShortXFlow() {
        // Measured on the live site (2026-10-14), timing kept server-side (session):
        //  - Step 1: accepted instantly.
        //  - Steps 2+: rejected at <= 8 s after the page was served, accepted at >= 9 s
        //    (it serves a plain article with no step form = "stuck").
        //    Speeding up the page's timer can't help: the server checks real time.
        //  - Tokens are tied to their step (posting step 1's token to the final
        //    gateway just restarts the flow), so steps can't be skipped.
        //  - A rejected post doesn't reset the clock; re-posting the same token is fine.
        // So: submit step 1 at once, later steps at ~9.2 s, and if a step is still
        // rejected, re-post its saved token every 1.5 s.
        const TAG = '[Bypasser:LinkShortX]';
        const log = (...a) => console.log(TAG, ...a);
        const PENDING = 'lsx_pending';
        const DEFAULT_WAIT = 9200, MAX_WAIT = 20000, RETRY_DELAY = 1500, MAX_RETRIES = 6;

        function badge(text) {
            let b = document.getElementById('lsx-badge');
            if (!b) {
                b = document.createElement('div');
                b.id = 'lsx-badge';
                b.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#111;color:#fff;' +
                    'font:600 13px/1.3 system-ui,sans-serif;padding:8px 12px;border-radius:8px;box-shadow:0 2px 10px #0006';
                (document.body || document.documentElement).appendChild(b);
            }
            b.textContent = 'Bypasser: ' + text;
        }
        function countdown(ms, label, done) {
            const end = Date.now() + ms;
            (function tick() {
                const left = end - Date.now();
                if (left <= 0) { badge(label + '…'); done(); return; }
                badge(`${label} in ${Math.ceil(left / 1000)}s`);
                setTimeout(tick, 250);
            })();
        }
        function getWait(cb) {
            try { chrome.storage.local.get(['lsxWait15'], r => cb(r.lsxWait15 || DEFAULT_WAIT)); }
            catch (e) { cb(DEFAULT_WAIT); }
        }
        function bumpWait() {
            getWait(w => { try { chrome.storage.local.set({ lsxWait15: Math.min(w + 500, MAX_WAIT) }); } catch (e) {} });
        }
        function postFields(action, fields) {
            const f = document.createElement('form');
            f.method = 'post'; f.action = action; f.style.display = 'none';
            fields.forEach(([k, v]) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); });
            document.documentElement.appendChild(f);
            HTMLFormElement.prototype.submit.call(f);
        }

        // ---- Step pages ("Step X of N", any number of steps) ----
        function handleStepPage() {
            const form = document.getElementById('fwd');
            if (!form || form.method.toLowerCase() !== 'post' ||
                !document.getElementById('go') || !document.getElementById('pDone')) return false;

            const m = document.title.match(/Step\s+(\d+)\s+of\s+(\d+)/i);
            const stepNo = m ? parseInt(m[1], 10) : 99; // "Your link is ready" = last step
            const fields = [...form.elements].filter(e => e.name).map(e => [e.name, e.value]);
            const action = form.action;

            const go = () => {
                // remember the token so a rejected post can be retried on the next page
                sessionStorage.setItem(PENDING, JSON.stringify({ action, fields, at: Date.now(), retries: 0 }));
                log('Submitting', document.title);
                HTMLFormElement.prototype.submit.call(form);
            };
            if (stepNo === 1) { badge('skipping step 1'); go(); return true; }
            getWait(wait => countdown(wait, `${document.title.split('·')[0].trim()} → next`, go));
            return true;
        }

        // ---- Rejected step: we posted a token and landed on a plain article ----
        function handleRejected() {
            let p = null;
            try { p = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); } catch (e) {}
            if (!p || Date.now() - p.at > 120000) return false;
            const same = u => u.split('#')[0].replace(/\/$/, '') === p.action.split('#')[0].replace(/\/$/, '');
            if (!same(location.href)) return false;      // we're somewhere else entirely
            if (p.retries >= MAX_RETRIES) { badge('step keeps getting rejected — finish it manually'); sessionStorage.removeItem(PENDING); return true; }
            log('Step was rejected (too fast). Retrying the same token…');
            bumpWait();
            countdown(RETRY_DELAY, 'server wants a bit longer, retrying', () => {
                p.retries++; p.at = Date.now();
                sessionStorage.setItem(PENDING, JSON.stringify(p));
                postFields(p.action, p.fields);
            });
            return true;
        }

        // ---- Final linkshortx.in page (AdLinkFly "Get Link") -> telegram.me ----
        function handleGetLinkPage() {
            if (!document.querySelector('a.get-link') || !document.getElementById('go-link')) return false;
            sessionStorage.removeItem(PENDING);
            badge('waiting for Get Link');
            const iv = setInterval(() => {
                const a = document.querySelector('a.get-link');
                if (!a || /(^|\s)disabled(\s|$)/.test(a.className)) return;
                const href = a.getAttribute('href') || '';
                if (!href || href === '#' || href.startsWith('javascript')) return;
                clearInterval(iv);
                badge('opening link');
                log('Opening', a.href);
                location.href = a.href;
            }, 300);
            return true;
        }

        // A step page means any earlier pending post was accepted.
        if (document.getElementById('fwd') && document.getElementById('pDone')) sessionStorage.removeItem(PENDING);
        window.__lsxHandled = handleStepPage() || handleGetLinkPage() || handleRejected();
    })();

    // Function to find and click a button by its text content
    function clickButtonByText(buttonText) {
        var buttons = Array.from(document.querySelectorAll('button'));
        var button = buttons.find(btn => btn.textContent.trim() === buttonText);
        if (button) {
            button.scrollIntoView(); // Ensure the button is in view
            button.click();
            return true;
        }
        return false;
    }

    // Function to find and invoke the startTimer function with a numerical suffix
    function runStartTimerFunctions() {
        // Loop through potential function names from startTimer1 to startTimer100
        for (let i = 1; i <= 100; i++) {
            let functionName = `startTimer${i}`;
        
            // Check if the function exists in the global window object
            if (typeof window[functionName] === 'function') {
                console.log(`Calling ${functionName}`); // For debugging
                window[functionName](); // Call the function
            }
        }
    }

    // Function to handle button clicks as soon as the button becomes visible
    function clickButtonWhenVisible(buttonText) {
           console.log('clickButtonWhenVisible '+ buttonText);

        var checkInterval = setInterval(function() {
            if (clickButtonByText(buttonText)) {
                       console.log('clickButtonWhenVisible clickButtonByText *********** '+ buttonText);

                clearInterval(checkInterval); // Stop checking once the button is clicked
            }
        }, 1000); // Check every second for the button to become visible
    }

    // Function to remove the timer element if necessary
    function removeTimer() {
        var timer = document.getElementById('txt2'); // Update with the correct ID of the timer element
        if (timer) {
            timer.style.display = 'none'; // Hide the timer
            // Alternatively, you could remove it entirely from the DOM:
            timer.remove();
        }
    }


    // Function to find and click an element (button or div) by its text content
    function clickElementByText(tag, text) {
        const elements = Array.from(document.querySelectorAll(tag));
        const el = elements.find(e => e.textContent.trim() === text);
        if (el) {
            el.scrollIntoView();
            el.click();
            console.log(`Clicked ${tag} with text: "${text}"`);
            return true;
        }
        return false;
    }

    // Function to handle clicks when an element becomes visible
    function clickElementWhenVisible(tag, text) {
        console.log(`Waiting for ${tag} with text: "${text}"...`);
        const interval = setInterval(() => {
            if (clickElementByText(tag, text)) {
                clearInterval(interval);
                waitForRemoveTimer();
            }
        }, 1000);
    }

     function clickElementByText(tag, text) {
            const elements = Array.from(document.querySelectorAll(tag));
            const el = elements.find(e => e.textContent.trim() === text);
            if (el) {
                el.scrollIntoView();
                el.click();
                console.log(`[Bypasser] Clicked ${tag} with text "${text}"`);
                return true;
            }
            removeTimer();
            return false;
        }


    function waitForRemoveTimer(){
          setTimeout(() => {
            removeTimer();
            // Step 3: Try clicking final "Now-Continue" button
            const clickNowContinue = () => {
                const btn = document.getElementById('rtg-snp-btn');
                if (btn) {
                    btn.scrollIntoView();
                    btn.click();
                    console.log('[Bypasser] Clicked final Now-Continue button');
                } else {
                    setTimeout(clickNowContinue, 1000);
                }
            };
            clickNowContinue();
        }, 2000);
    }    


    // Start the process by running timer functions and clicking buttons as they become visible
    function startAutomationProcess() {
        if (window.__lsxHandled) return; // LinkShortX pages have their own handler



        clickElementWhenVisible('div', 'Click here to verify');
        waitForRemoveTimer();
       clickElementWhenVisible('div', 'Now-Continue');
       clickElementWhenVisible('div', 'Continue');


            console.log('Automation process started');

        // Run startTimer functions initially
        runStartTimerFunctions();
    
        // Click the initial button
        clickButtonWhenVisible('I Am Not Robot');
    
        // Click subsequent buttons as they become visible
        clickButtonWhenVisible('Dual Tap To "Go To Link"');
        clickButtonWhenVisible('Dual Tap "Go Link"');
        clickButtonWhenVisible('Dual Tap "Continue"');
        clickButtonWhenVisible('Dual Tap "Continue"');
        clickButtonWhenVisible('Open Continue..');
        clickButtonWhenVisible('Open Continue.');
        clickButtonWhenVisible('Open Continue');
        clickButtonWhenVisible('Open-Continue');
        clickButtonWhenVisible('Open-Continue.');
        clickButtonWhenVisible('Open-Continue..');
        clickButtonWhenVisible('Open-Continue...');
        clickButtonWhenVisible('Get Link');
        clickButtonWhenVisible('Dual Tap Verify');
        clickButtonWhenVisible('Click here to verify');
        clickButtonWhenVisible('Dual Tap "Go Link"'); // Include the new button here
    }


    function stopAutomationProcess() {
        console.log('Automation process stopped');
        // Implement your logic to stop any ongoing automation
    }

    // Legacy click-by-text flow: only on the old known domains, never on random sites
    const LEGACY_HOSTS = ['dragontales.lat', 'hindisink.com', 'nanotech.org.in', 'softspoker.co.in',
                          'audioverse.org.in', 'linkshortx.in'];
    const onLegacyHost = LEGACY_HOSTS.some(h => location.hostname === h || location.hostname.endsWith('.' + h));
    if (!window.__lsxHandled && onLegacyHost) startAutomationProcess();

}

try {
    chrome.storage.local.get(['isEnabled'], r => { if (!r || r.isEnabled !== false) runBypasser(); });
} catch (e) {
    runBypasser();
}
