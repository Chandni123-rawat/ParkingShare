export default function AccountPage({ title, description, children }) {
    return <main className="account-page">
        <section className="account-card">
            <h1>{title}</h1>
            {description && <p className="account-description">{description}</p>}
            {children}
        </section>
    </main>;
}
