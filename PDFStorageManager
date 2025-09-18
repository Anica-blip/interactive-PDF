// Add this method to pdf-storage-manager.js
async fetchFromWasabi(cloudFilename) {
  try {
    const getParams = {
      Bucket: this.config.wasabi.bucketName,
      Key: cloudFilename
    };
    
    const command = new GetObjectCommand(getParams);
    const result = await this.s3Client.send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of result.Body) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    throw new Error(`Failed to fetch from Wasabi: ${error.message}`);
  }
}
