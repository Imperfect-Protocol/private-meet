const navItems = [
  ["Our Vision", "https://privatemeet.imperfectprotocol.ie/"],
  ["Who are we", "https://privatemeet.imperfectprotocol.ie/who-are-we"],
  ["Contact Us", "https://privatemeet.imperfectprotocol.ie/contact"],
];

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Private Meet navigation">
      <a className="site-nav__brand" href="https://privatemeet.imperfectprotocol.ie/" target="_blank">
        <span className="site-nav__wordmark">
          <span className="site-nav__title">Private Meet</span>
          <span className="site-nav__subtitle">Imperfect Protocol</span>
        </span>
      </a>
      <div className="site-nav__links">
        {navItems.map(([label, href], index) => (
          <span key={href}>
            <a href={href} target="_blank">{label}</a>
            {index < navItems.length - 1 ? <i>|</i> : null}
          </span>
        ))}
      </div>
    </nav>
  );
}
