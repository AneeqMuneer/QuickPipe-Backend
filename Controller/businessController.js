const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const BusinessModel = require("../Model/businessModel");

const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

const { CleanExtractedText } = require("../Utils/businessUtils");

exports.GetBusinessData = catchAsyncError(async (req, res, next) => {
    const { CurrentWorkspaceId } = req.user.User;

    const Business = await BusinessModel.findOne({
        where: {
            WorkspaceId: CurrentWorkspaceId
        }
    });

    if (!Business) {
        return next(new ErrorHandler("Business not found", 404));
    }

    const { WebsiteData, DocumentData, BusinessName } = Business;

    const Websites = WebsiteData.length > 0 ? WebsiteData.map(site => site.Url) : [];
    const Documents = DocumentData.length > 0 ? DocumentData.map(doc => doc.Name) : [];

    res.status(200).json({
        success: true,
        message: "Business data fetched successfully",
        BusinessDetails: {
            BusinessName,
            Websites,
            Documents
        }
    });
});

exports.UpdateBusinessName = catchAsyncError(async (req, res, next) => {
    const { CurrentWorkspaceId } = req.user.User;
    const { BusinessName } = req.body;

    const Business = await BusinessModel.findOne({
        where: { WorkspaceId: CurrentWorkspaceId }
    });

    if (!Business) {
        return next(new ErrorHandler("Business not found", 404));
    }

    Business.BusinessName = BusinessName;
    await Business.save();

    res.status(200).json({
        success: true,
        message: "Business name updated successfully",
        BusinessName
    });
});

exports.AddWebsiteData = catchAsyncError(async (req, res, next) => {
    const { CurrentWorkspaceId } = req.user.User;
    const { WebsiteUrls } = req.body;

    const Business = await BusinessModel.findOne({
        where: { WorkspaceId: CurrentWorkspaceId }
    });

    if (!Business) {
        return next(new ErrorHandler("Business not found", 404));
    }

    if (!WebsiteUrls || !Array.isArray(WebsiteUrls) || WebsiteUrls.length === 0) {
        return next(new ErrorHandler("Please provide at least one website URL", 400));
    }

    const WebsiteData = [];

    for (const url of WebsiteUrls) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove unwanted elements
            $('script, style, nav, header, footer, .advertisement, [class*="ads"], iframe, noscript, meta, link, title').remove();

            let uniqueTextSegments = new Set();
            let elements = $('article, main, .content, #content, .main, #main, .post, .entry, .hero, .section').toArray();

            if (elements.length === 0) {
                elements = $('p, h1, h2, h3, h4, h5, h6, .text, .description').toArray();
            }

            if (elements.length === 0) {
                const bodyText = $('body').text().trim();
                const segments = bodyText
                    .split(/\n+/)
                    .map(s => s.trim())
                    .filter(Boolean);
                uniqueTextSegments = new Set(segments);
            } else {
                const MIN_LENGTH = 50;
                elements.forEach(elem => {
                    const text = $(elem).text().trim();
                    if (text && text.length > MIN_LENGTH) {
                        uniqueTextSegments.add(text);
                    }
                });
            }

            // Combine all unique segments into final cleaned text
            let finalText = Array.from(uniqueTextSegments).join('\n\n');

            finalText = finalText
                .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs
                .replace(/\n{3,}/g, '\n\n') // Collapse >2 newlines to 2
                .trim();

            WebsiteData.push({
                Url: url,
                Data: finalText
            });

            console.log(`${url} fetched successfully`);

        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return next(new ErrorHandler(`Failed to fetch or parse content from ${url}`, 400));
        }
    }

    Business.WebsiteData = WebsiteData;
    await Business.save();

    res.status(200).json({
        success: true,
        message: "Website data added successfully"
    });
});

// Only PDF and DOCX files are allowed
exports.AddDocumentData = catchAsyncError(async (req, res, next) => {
    const { CurrentWorkspaceId } = req.user.User;

    if (!req.files || req.files.length === 0) {
        return next(new ErrorHandler("No documents uploaded", 400));
    }

    const Business = await BusinessModel.findOne({
        where: {
            WorkspaceId: CurrentWorkspaceId
        }
    });

    if (!Business) {
        return next(new ErrorHandler("Business not found", 404));
    }

    const DocumentData = [];
    const UnsavedFiles = [];

    for (const file of req.files) {
        if (file.mimetype === 'application/pdf') {
            try {
                const dataBuffer = fs.readFileSync(file.path);
                const pdfText = await pdfParse(dataBuffer);
                const cleanedText = CleanExtractedText(pdfText.text);
                DocumentData.push({ Name: file.originalname, Data: cleanedText });
            } catch (error) {
                console.error(`Error extracting text from ${file.originalname}:`, error);
                UnsavedFiles.push(file.originalname);
            }
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
                const docxText = await mammoth.extractRawText({ path: file.path });
                const cleanedText = CleanExtractedText(docxText.value);
                DocumentData.push({ Name: file.originalname, Data: cleanedText });
            } catch (error) {
                console.error(`Error extracting text from ${file.originalname}:`, error);
                UnsavedFiles.push(file.originalname);
            }
        }
    }

    Business.DocumentData = DocumentData;
    await Business.save();

    res.status(200).json({
        success: true,
        message: "Document data added successfully",
        UnsavedFiles
    });
});