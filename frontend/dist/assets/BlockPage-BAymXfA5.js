import{i as e,n as t,t as n}from"./jsx-runtime-BKllkxft.js";import{A as r,r as i}from"./index-FBNTGIcf.js";var a=e(t(),1),o=n();function s(){let[e]=r(),t=e.get(`attack_type`)||`Cross-Site Scripting (XSS)`,n=e.get(`client_ip`)||`127.0.0.1`,s=e.get(`real_ip`)||n,c=e.get(`reason`)||`Request blocked by security rules`,l=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).slice(0,19)+` UTC`,u=e.get(`reference_id`)||`MDSF `+Math.random().toString(36).substr(2,8).toUpperCase(),d=e.get(`url`)||window.location.pathname,f=e.get(`host`)||window.location.hostname||`mahabubur.shop`,[p,m]=(0,a.useState)(!1),[h,g]=(0,a.useState)(``),[_,v]=(0,a.useState)(``),[y,b]=(0,a.useState)(!1),[x,S]=(0,a.useState)(!1),[C,w]=(0,a.useState)(``),[T,E]=(0,a.useState)(!1);return(0,o.jsxs)(`div`,{className:`cf-block-page-root`,children:[(0,o.jsx)(`style`,{children:`
        .cf-block-page-root {
          min-height: 100vh;
          width: 100%;
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
          color: #333333;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-wrap {
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .cf-header {
          padding-top: 52px;
          padding-bottom: 28px;
        }

        .cf-title {
          font-size: 38px;
          font-weight: 400;
          color: #333333;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .cf-subtitle {
          font-size: 16px;
          font-weight: 400;
          color: #666666;
          margin: 0;
          line-height: 1.4;
        }

        .cf-domain {
          color: #333333;
          font-weight: 500;
        }

        .cf-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e2e2e2;
          border-bottom: 1px solid #e2e2e2;
          padding: 48px 24px;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cf-browser-mockup {
          max-width: 720px;
          width: 100%;
          background: #ffffff;
          border-radius: 6px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #dcdcdc;
        }

        .cf-browser-header {
          background: #8a8a8a;
          height: 38px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 6px;
        }

        .cf-browser-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.85;
          display: inline-block;
        }

        .cf-browser-bar-input {
          margin-left: 14px;
          background: rgba(255, 255, 255, 0.3);
          height: 20px;
          border-radius: 3px;
          width: 38%;
          max-width: 220px;
        }

        .cf-browser-body {
          height: 270px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(189, 36, 38, 0.22);
        }

        .cf-columns-section {
          padding-top: 48px;
          padding-bottom: 36px;
        }

        .cf-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 52px;
        }

        @media (max-width: 740px) {
          .cf-columns-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          .cf-title {
            font-size: 28px;
          }
          .cf-mockup-section {
            padding: 30px 16px;
          }
          .cf-browser-body {
            height: 210px;
          }
          .cf-badge-circle {
            width: 76px;
            height: 76px;
          }
        }

        .cf-col-heading {
          font-size: 19px;
          font-weight: 600;
          color: #222222;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .cf-col-desc {
          font-size: 14.5px;
          line-height: 1.65;
          color: #555555;
          margin: 0;
        }

        .cf-pill {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          font-size: 12.5px;
          color: #991b1b;
          font-weight: 500;
        }

        .cf-action-tools {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cf-btn-contact {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2b2b2b;
          color: #ffffff;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .cf-btn-contact:hover {
          background: #111111;
        }

        .cf-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cf-btn-secondary:hover {
          background: #e5e7eb;
        }

        .cf-footer-section {
          margin-top: auto;
          border-top: 1px solid #e2e2e2;
          padding: 26px 0 36px 0;
        }

        .cf-footer-meta {
          font-size: 13px;
          color: #777777;
          line-height: 1.8;
          text-align: center;
        }

        .cf-meta-dot {
          margin: 0 10px;
          color: #9ca3af;
        }

        .cf-ip-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          color: #374151;
          font-weight: 500;
        }

        /* Modal */
        .cf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .cf-modal-box {
          background: #ffffff;
          border-radius: 8px;
          padding: 28px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          text-align: left;
        }

        .cf-input {
          width: 100%;
          padding: 9px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          margin-bottom: 12px;
          box-sizing: border-box;
          outline: none;
        }
        .cf-input:focus {
          border-color: #2b2b2b;
        }
      `}),(0,o.jsx)(`header`,{className:`cf-header`,children:(0,o.jsxs)(`div`,{className:`cf-wrap`,children:[(0,o.jsx)(`h1`,{className:`cf-title`,children:`Sorry, you have been blocked`}),(0,o.jsxs)(`p`,{className:`cf-subtitle`,children:[`You are unable to access `,(0,o.jsx)(`span`,{className:`cf-domain`,children:f})]})]})}),(0,o.jsx)(`section`,{className:`cf-mockup-section`,children:(0,o.jsxs)(`div`,{className:`cf-browser-mockup`,children:[(0,o.jsxs)(`div`,{className:`cf-browser-header`,"aria-hidden":`true`,children:[(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-bar-input`})]}),(0,o.jsx)(`div`,{className:`cf-browser-body`,children:(0,o.jsx)(`div`,{className:`cf-badge-circle`,role:`img`,"aria-label":`Access Blocked`,children:(0,o.jsxs)(`svg`,{width:`44`,height:`44`,viewBox:`0 0 24 24`,fill:`none`,stroke:`#ffffff`,strokeWidth:`3.4`,strokeLinecap:`round`,strokeLinejoin:`round`,children:[(0,o.jsx)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`}),(0,o.jsx)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`})]})})})]})}),(0,o.jsx)(`main`,{className:`cf-columns-section`,children:(0,o.jsx)(`div`,{className:`cf-wrap`,children:(0,o.jsxs)(`div`,{className:`cf-columns-grid`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h2`,{className:`cf-col-heading`,children:`Why have I been blocked?`}),(0,o.jsx)(`p`,{className:`cf-col-desc`,children:`This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.`}),(0,o.jsxs)(`div`,{className:`cf-pill`,children:[(0,o.jsx)(`span`,{children:`Violation:`}),(0,o.jsx)(`strong`,{children:t})]})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h2`,{className:`cf-col-heading`,children:`What can I do to resolve this?`}),(0,o.jsx)(`p`,{className:`cf-col-desc`,children:`You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up and the MDefender Ray ID found at the bottom of this page.`}),(0,o.jsxs)(`div`,{className:`cf-action-tools`,children:[(0,o.jsx)(`button`,{type:`button`,className:`cf-btn-contact`,onClick:()=>m(!0),children:`Report False Positive`}),(0,o.jsx)(`button`,{type:`button`,className:`cf-btn-secondary`,onClick:()=>{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(u).then(()=>{E(!0),setTimeout(()=>E(!1),2e3)}).catch(()=>{alert(`MDefender Ray ID: `+u)}):alert(`MDefender Ray ID: `+u)},children:T?`Copied!`:`Copy Ray ID`}),(0,o.jsx)(`button`,{type:`button`,className:`cf-btn-secondary`,onClick:()=>window.location.href=`/`,children:`Return Home`})]})]})]})})}),(0,o.jsx)(`footer`,{className:`cf-footer-section`,children:(0,o.jsx)(`div`,{className:`cf-wrap`,children:(0,o.jsxs)(`div`,{className:`cf-footer-meta`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsxs)(`span`,{children:[`MDefender Ray ID: `,(0,o.jsx)(`strong`,{children:u})]}),(0,o.jsx)(`span`,{className:`cf-meta-dot`,children:`•`}),(0,o.jsxs)(`span`,{children:[`Your IP: `,(0,o.jsx)(`span`,{className:`cf-ip-mono`,children:n})]}),(0,o.jsx)(`span`,{className:`cf-meta-dot`,children:`•`}),(0,o.jsxs)(`span`,{children:[`Performance & security by `,(0,o.jsx)(`strong`,{children:`MDefender Pro`})]})]}),(0,o.jsx)(`div`,{style:{marginTop:`4px`,fontSize:`12px`,color:`#888888`},children:(0,o.jsxs)(`span`,{children:[`Timestamp: `,l]})})]})})}),p&&(0,o.jsx)(`div`,{className:`cf-modal-overlay`,onClick:()=>m(!1),children:(0,o.jsxs)(`div`,{className:`cf-modal-box`,onClick:e=>e.stopPropagation(),children:[(0,o.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`16px`},children:[(0,o.jsx)(`h3`,{style:{margin:0,fontSize:`17px`,fontWeight:600,color:`#bd2426`},children:`Report False Positive`}),(0,o.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:`#888`,fontSize:`20px`,cursor:`pointer`},onClick:()=>m(!1),children:`×`})]}),x?(0,o.jsxs)(`div`,{style:{textAlign:`center`,padding:`20px 0`},children:[(0,o.jsx)(`div`,{style:{width:`52px`,height:`52px`,borderRadius:`50%`,background:`#dcfce7`,color:`#16a34a`,fontSize:`22px`,display:`flex`,alignItems:`center`,justifyContent:`center`,margin:`0 auto 14px`},children:`✓`}),(0,o.jsx)(`h4`,{style:{margin:`0 0 8px 0`,fontSize:`16px`,color:`#111827`},children:`Report Submitted`}),(0,o.jsxs)(`p`,{style:{fontSize:`13.5px`,color:`#6b7280`,margin:`0 0 18px 0`,lineHeight:1.5},children:[`Reference Ray ID `,(0,o.jsx)(`strong`,{children:u}),` has been forwarded to the SOC administrators.`]}),(0,o.jsx)(`button`,{className:`cf-btn-contact`,onClick:()=>m(!1),style:{margin:`0 auto`},children:`Close`})]}):(0,o.jsxs)(`form`,{onSubmit:async e=>{e.preventDefault(),b(!0),w(``);try{await i.reportFalsePositive({reference_id:u,client_ip:s,url:d,payload:window.location.search||d,attack_type:t,reason:c,user_email:h,comments:_}),S(!0)}catch(e){w(e.message||`Failed to submit report. Please email the administrator.`)}finally{b(!1)}},children:[(0,o.jsx)(`p`,{style:{fontSize:`13px`,color:`#666666`,marginBottom:`16px`,lineHeight:1.5},children:`If your request was blocked erroneously, provide your email and details below for administrative review.`}),C&&(0,o.jsx)(`div`,{style:{padding:`8px 12px`,borderRadius:`6px`,background:`#fee2e2`,color:`#991b1b`,fontSize:`12.5px`,marginBottom:`12px`},children:C}),(0,o.jsx)(`div`,{style:{marginBottom:`6px`,fontSize:`12px`,fontWeight:600,color:`#374151`},children:`MDefender Ray ID`}),(0,o.jsx)(`input`,{type:`text`,className:`cf-input`,value:u,disabled:!0,style:{background:`#f9fafb`,color:`#6b7280`}}),(0,o.jsx)(`div`,{style:{marginBottom:`6px`,fontSize:`12px`,fontWeight:600,color:`#374151`},children:`Your Email (Optional)`}),(0,o.jsx)(`input`,{type:`email`,className:`cf-input`,placeholder:`contact@yourdomain.com`,value:h,onChange:e=>g(e.target.value)}),(0,o.jsx)(`div`,{style:{marginBottom:`6px`,fontSize:`12px`,fontWeight:600,color:`#374151`},children:`What were you trying to do?`}),(0,o.jsx)(`textarea`,{rows:3,className:`cf-input`,placeholder:`Describe your actions before the block page appeared...`,value:_,onChange:e=>v(e.target.value),style:{resize:`vertical`}}),(0,o.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`10px`,marginTop:`16px`},children:[(0,o.jsx)(`button`,{type:`button`,className:`cf-btn-secondary`,onClick:()=>m(!1),children:`Cancel`}),(0,o.jsx)(`button`,{type:`submit`,className:`cf-btn-contact`,disabled:y,children:y?`Submitting...`:`Submit Report`})]})]})]})})]})}export{s as default};