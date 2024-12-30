// context.js
const files = ['about.md', 'career_experience.md', 'education.md', 'projects.md', 'publications.md', 'technical_skills.md'];

async function fetchAndCombineFiles() {
    let combinedContent = '';

    await Promise.all(
        files.map(file =>
            fetch(`files/${file}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch ${file}`);
                    return response.text();
                })
                .then(content => {
                    combinedContent += `${content}\n\n\n`;
                })
        )
    );

    return combinedContent.trim();
}

export default fetchAndCombineFiles;
