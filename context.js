// context.js
const files = ['about.txt', 'career_experience.txt', 'education.txt', 'projects.txt', 'technical_skills.txt'];

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
                    const fileNameWithoutExtension = file.replace('.txt', '').toUpperCase();
                    combinedContent += `${fileNameWithoutExtension}\n\n${content}\n\n\n`;
                })
        )
    );

    return combinedContent.trim();
}

export default fetchAndCombineFiles;
