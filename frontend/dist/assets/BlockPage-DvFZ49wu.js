import{a as e,n as t,t as n}from"./jsx-runtime-KJkY8l8U.js";import{A as r}from"./index-D2gRN-rG.js";var i=e(t(),1),a=n();function o(){let[e]=r(),t=e.get(`domain`)||window.location.hostname||`mahabubur.shop`,n=e.get(`ray_id`)||e.get(`ref_id`)||`MDEF-2070BF20`,o=e.get(`ip`)||`103.120.45.241`,s=e.get(`rule`)||`Pre-Flight WAAP: SQL & NoSQL Injection Guard`,c=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).substring(0,19)+` UTC`,[l,u]=(0,i.useState)(!1),[d,f]=(0,i.useState)(!1),[p,m]=(0,i.useState)(``),[h,g]=(0,i.useState)(``),[_,v]=(0,i.useState)(!1);return(0,a.jsxs)(`div`,{className:`bp-root`,children:[(0,a.jsx)(`style`,{children:`
        :root {
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
            --text-main: #333333;
            --text-sub: #555555;
            --text-muted: #777777;
            --bg-gray: #eeeeee;
            --browser-bar: #8a8a8a;
            --alert-red: #bd2426;
        }

        *,
        *::before,
        *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html,
        body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #ffffff;
            font-family: var(--font-family);
            color: var(--text-main);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .bp-root {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background-color: #ffffff;
            overflow: hidden;
        }

        .content-wrap {
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 0 36px;
        }

        /* Top Heading Section */
        .header-section {
            padding-top: 18px;
            padding-bottom: 12px;
        }

        .policy-pill {
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #555555;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 3px 12px;
            border-radius: 9999px;
            margin-bottom: 6px;
        }

        .blocked-title {
            font-size: 40px;
            font-weight: 400;
            color: #333333;
            margin: 0 0 6px 0;
            letter-spacing: -0.02em;
            line-height: 1.15;
        }

        .blocked-subtitle {
            font-size: 16px;
            font-weight: 400;
            color: #666666;
            margin: 0;
            line-height: 1.35;
        }

        .blocked-domain {
            color: #333333;
            font-weight: 500;
        }

        /* Center Full-Width Gray Section with Browser Mockup */
        .mockup-section {
            width: 100%;
            background-color: var(--bg-gray);
            border-top: 1px solid #dcdcdc;
            border-bottom: none;
            padding: 38px 36px 0 36px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
        }

        .browser-mockup {
            max-width: 980px;
            width: 100%;
            background: #ffffff;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
            box-shadow: 0 -4px 22px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            border: 1px solid #dcdcdc;
            border-bottom: none;
        }

        .browser-header {
            background: var(--browser-bar);
            height: 38px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 8px;
        }

        .browser-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #ffffff;
            opacity: 0.85;
            display: inline-block;
        }

        .browser-address-bar {
            margin-left: 16px;
            background: rgba(255, 255, 255, 0.3);
            height: 20px;
            border-radius: 3px;
            width: 38%;
            max-width: 240px;
        }

        .browser-body {
            height: 305px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }

        .block-badge-circle {
            width: 104px;
            height: 104px;
            border-radius: 50%;
            background-color: var(--alert-red);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 22px rgba(189, 36, 38, 0.25);
        }

        .block-badge-circle svg {
            width: 48px;
            height: 48px;
            stroke: #ffffff;
            stroke-width: 3.4;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* Bottom 2 Columns */
        .columns-section {
            padding-top: 18px;
            padding-bottom: 18px;
        }

        .columns-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 52px;
        }

        @media (max-width: 740px) {
            .columns-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            html, body, .bp-root {
                overflow: auto;
            }
        }

        .col-heading {
            font-size: 18px;
            font-weight: 500;
            color: #333333;
            margin: 0 0 6px 0;
            line-height: 1.3;
        }

        .col-desc {
            font-size: 14px;
            line-height: 1.55;
            color: #555555;
            margin: 0;
        }

        .attack-pill {
            margin-top: 10px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            background: #fee2e2;
            border: 1px solid #fca5a5;
            border-radius: 4px;
            font-size: 12px;
            color: #991b1b;
            font-family: var(--font-mono);
        }

        .action-tools {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn-contact {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 15px;
            background: #2b2b2b;
            color: #ffffff;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .btn-contact:hover {
            background: #111111;
        }

        .btn-copy {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 15px;
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-copy:hover {
            background: #e5e7eb;
            color: #111111;
        }

        /* Footer Metadata */
        .footer-section {
            border-top: 1px solid #e2e2e2;
            padding: 10px 0 12px 0;
            background: #fafafa;
        }

        .footer-meta {
            font-size: 12.5px;
            color: var(--text-muted);
            line-height: 1.4;
            text-align: center;
        }

        .footer-meta strong {
            color: #222222;
        }

        .meta-dot {
            margin: 0 8px;
            color: #9ca3af;
        }

        .ip-mono {
            font-family: var(--font-mono);
            color: #374151;
            font-weight: 500;
        }

        /* Modal Styles */
        .bp-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 16px;
        }

        .bp-modal-card {
            background: #ffffff;
            border-radius: 8px;
            max-width: 480px;
            width: 100%;
            padding: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}),(0,a.jsx)(`header`,{className:`header-section`,children:(0,a.jsxs)(`div`,{className:`content-wrap`,children:[(0,a.jsx)(`span`,{className:`policy-pill`,children:`MDEFENDER PRO • EDGE POLICY ENFORCEMENT`}),(0,a.jsx)(`h1`,{className:`blocked-title`,children:`Access Restricted by Security Policy`}),(0,a.jsxs)(`p`,{className:`blocked-subtitle`,children:[`Your connection to `,(0,a.jsx)(`span`,{className:`blocked-domain`,children:t}),` was flagged and intercepted by automated threat protection.`]})]})}),(0,a.jsx)(`section`,{className:`mockup-section`,children:(0,a.jsxs)(`div`,{className:`browser-mockup`,children:[(0,a.jsxs)(`div`,{className:`browser-header`,"aria-hidden":`true`,children:[(0,a.jsx)(`span`,{className:`browser-dot`}),(0,a.jsx)(`span`,{className:`browser-dot`}),(0,a.jsx)(`span`,{className:`browser-dot`}),(0,a.jsx)(`span`,{className:`browser-address-bar`})]}),(0,a.jsx)(`div`,{className:`browser-body`,children:(0,a.jsx)(`div`,{className:`block-badge-circle`,role:`img`,"aria-label":`Blocked Access`,children:(0,a.jsxs)(`svg`,{viewBox:`0 0 24 24`,fill:`none`,children:[(0,a.jsx)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`}),(0,a.jsx)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`})]})})})]})}),(0,a.jsx)(`main`,{className:`columns-section`,children:(0,a.jsx)(`div`,{className:`content-wrap`,children:(0,a.jsxs)(`div`,{className:`columns-grid`,children:[(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`col-heading`,children:`Why have I been blocked?`}),(0,a.jsx)(`p`,{className:`col-desc`,children:`This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.`}),(0,a.jsxs)(`div`,{className:`attack-pill`,children:[(0,a.jsx)(`span`,{children:`Violation:`}),(0,a.jsx)(`strong`,{children:s})]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`col-heading`,children:`What can I do to resolve this?`}),(0,a.jsx)(`p`,{className:`col-desc`,children:`You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up and the MDefender Ray ID found at the bottom of this page.`}),(0,a.jsxs)(`div`,{className:`action-tools`,children:[(0,a.jsx)(`button`,{type:`button`,className:`btn-contact`,onClick:()=>f(!0),children:`Contact Site Administrator`}),(0,a.jsx)(`button`,{type:`button`,className:`btn-copy`,onClick:()=>{navigator.clipboard&&navigator.clipboard.writeText&&(navigator.clipboard.writeText(n),u(!0),setTimeout(()=>u(!1),2e3))},style:l?{borderColor:`#10b981`,color:`#10b981`}:{},children:l?`Copied!`:`Copy Ray ID`})]})]})]})})}),(0,a.jsx)(`footer`,{className:`footer-section`,children:(0,a.jsx)(`div`,{className:`content-wrap`,children:(0,a.jsxs)(`div`,{className:`footer-meta`,children:[(0,a.jsxs)(`div`,{children:[(0,a.jsxs)(`span`,{children:[`MDefender Ray ID: `,(0,a.jsx)(`strong`,{id:`rayIdVal`,children:n})]}),(0,a.jsx)(`span`,{className:`meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Your IP: `,(0,a.jsx)(`span`,{className:`ip-mono`,children:o})]}),(0,a.jsx)(`span`,{className:`meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Performance & security by `,(0,a.jsx)(`strong`,{children:`MDefender Pro`})]})]}),(0,a.jsx)(`div`,{style:{marginTop:`2px`,fontSize:`11.5px`,color:`#888888`},children:(0,a.jsxs)(`span`,{children:[`Timestamp: `,(0,a.jsx)(`span`,{children:c})]})})]})})}),d&&(0,a.jsx)(`div`,{className:`bp-modal-overlay`,onClick:()=>f(!1),children:(0,a.jsxs)(`div`,{className:`bp-modal-card`,onClick:e=>e.stopPropagation(),children:[(0,a.jsx)(`h3`,{style:{fontSize:`18px`,fontWeight:600,color:`#0f172a`,marginBottom:`8px`},children:`Report False Positive / Request Access`}),(0,a.jsxs)(`p`,{style:{fontSize:`13px`,color:`#64748b`,marginBottom:`16px`},children:[`Your report will be sent to the security team of `,(0,a.jsx)(`strong`,{children:t}),` along with Ray ID `,(0,a.jsx)(`code`,{children:n}),`.`]}),_?(0,a.jsx)(`div`,{style:{padding:`16px`,background:`#ecfdf5`,color:`#065f46`,borderRadius:`6px`,fontSize:`13px`,fontWeight:500,textAlign:`center`},children:`Report sent successfully! The administrator will review your incident.`}):(0,a.jsxs)(`form`,{onSubmit:e=>{e.preventDefault(),v(!0),setTimeout(()=>{f(!1),v(!1),m(``),g(``)},1800)},children:[(0,a.jsxs)(`div`,{style:{marginBottom:`12px`},children:[(0,a.jsx)(`label`,{style:{display:`block`,fontSize:`12px`,fontWeight:600,color:`#334155`,marginBottom:`4px`},children:`Your Email Address`}),(0,a.jsx)(`input`,{type:`email`,required:!0,value:p,onChange:e=>m(e.target.value),placeholder:`user@example.com`,style:{width:`100%`,padding:`8px 12px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,fontSize:`13px`}})]}),(0,a.jsxs)(`div`,{style:{marginBottom:`16px`},children:[(0,a.jsx)(`label`,{style:{display:`block`,fontSize:`12px`,fontWeight:600,color:`#334155`,marginBottom:`4px`},children:`What were you doing when blocked?`}),(0,a.jsx)(`textarea`,{rows:3,required:!0,value:h,onChange:e=>g(e.target.value),placeholder:`Describe your actions so the administrator can verify your request...`,style:{width:`100%`,padding:`8px 12px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,fontSize:`13px`}})]}),(0,a.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`8px`},children:[(0,a.jsx)(`button`,{type:`button`,onClick:()=>f(!1),style:{padding:`7px 14px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,background:`#ffffff`,color:`#475569`,fontSize:`13px`,cursor:`pointer`},children:`Cancel`}),(0,a.jsx)(`button`,{type:`submit`,style:{padding:`7px 16px`,borderRadius:`4px`,border:`none`,background:`#1e293b`,color:`#ffffff`,fontSize:`13px`,fontWeight:500,cursor:`pointer`},children:`Send Incident Report`})]})]})]})})]})}export{o as default};