function ClubsTab({ clubs }) {
  return (
    <div className="lk-card-full">
      <div className="formkurve-header">
        <div className="formkurve-title">Vereinsübersicht ({clubs.length})</div>
      </div>
      <div className="season-content">
        <div className="table-responsive">
          <table className="lk-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Ort</th>
                <th>Region</th>
                <th>Webseite</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.id}>
                  <td>{club.name}</td>
                  <td>{club.city || '–'}</td>
                  <td>{club.region || '–'}</td>
                  <td>{club.website ? <a href={club.website} target="_blank" rel="noreferrer">Link</a> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ClubsTab;

